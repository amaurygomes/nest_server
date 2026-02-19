import {
    Inject,
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { UserStatus } from '../accounts/dto/create-account.dto';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import {
    plans,
    subscriptions,
    planIntervalEnum,
    accounts,
    payments,
} from 'src/providers/database/drizzle/schema';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import { CreatePlanDto, PlanInterval } from './dto/create-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { addDays, addMonths, addYears } from 'date-fns';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class SubscriptionsService {
    constructor(
        @Inject('DRIZZLE') private readonly db: DrizzleDb,
        private readonly paymentsService: PaymentsService,
    ) { }

    async createPlan(createPlanDto: CreatePlanDto) {
        const [newPlan] = await this.db
            .insert(plans)
            .values({
                name: createPlanDto.name,
                description: createPlanDto.description,
                price: createPlanDto.price.toString(),
                interval: createPlanDto.interval,
                dailyLateFee: createPlanDto.dailyLateFee?.toString(),
                lateFeeAfter30Days: createPlanDto.lateFeeAfter30Days?.toString(),
                customPrices: createPlanDto.customPrices,
                tax: createPlanDto.tax?.toString(),
                targetVehicleTypes: createPlanDto.targetVehicleTypes,
            })
            .returning();

        return newPlan;
    }

    async findAllPlans(vehicleType?: string, showAllIfNoType: boolean = false) {
        if (!vehicleType) {
            if (showAllIfNoType) {
                // Return ALL plans (Admin view without filter)
                return this.db.select().from(plans);
            }
            // Return universal plans only (targetVehicleTypes is null)
            return this.db.select().from(plans).where(isNull(plans.targetVehicleTypes));
        }

        // Return universal plans OR plans targeting this vehicle type
        // Note: targetVehicleTypes is a JSONB array. 
        // We want: targetVehicleTypes IS NULL OR targetVehicleTypes @> [vehicleType]
        // Drizzle specific syntax required.
        // If simple JSON array check is tricky, we might need sql operator.
        // But let's try arrayContains if supported for jsonb, or raw sql.

        // return this.db.select().from(plans).where(
        //     or(
        //         isNull(plans.targetVehicleTypes),
        //         arrayContains(plans.targetVehicleTypes, [vehicleType]) 
        //     )
        // );

        // Using safe SQL approach to avoid type issues if arrayContains isn't perfect for jsonb
        // actually sql`...` is safer for JSONB containment

        // Actually, let's use the Query Builder properly.
        return this.db.select().from(plans).where(
            or(
                isNull(plans.targetVehicleTypes),
                sql`${plans.targetVehicleTypes}::jsonb @> ${JSON.stringify([vehicleType])}::jsonb`
            )
        );
    }

    async createSubscription(createSubscriptionDto: CreateSubscriptionDto) {
        const { planId, accountId, dueDay } = createSubscriptionDto;

        // Validate Plan
        const [plan] = await this.db
            .select()
            .from(plans)
            .where(eq(plans.id, planId));

        if (!plan) {
            throw new NotFoundException('Plan not found');
        }

        // Validate Account
        const [account] = await this.db
            .select()
            .from(accounts)
            .where(eq(accounts.id, accountId));

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        // Validate Account Status (Only Active or Inactive can pay)
        if (account.status !== UserStatus.A && account.status !== UserStatus.I) {
            throw new ForbiddenException(`User status (${account.status}) is not allowed to create subscriptions.`);
        }

        // Validate Vehicle Type Compatibility
        const targetTypes = plan.targetVehicleTypes as string[] | null;
        if (targetTypes && targetTypes.length > 0) {
            if (!account.vehicleType || !targetTypes.includes(account.vehicleType)) {
                throw new BadRequestException(`Plan ${plan.name} is not available for your vehicle type (${account.vehicleType || 'None'}).`);
            }
        }

        // Check for existing subscription to renew/extend
        const [existingSubscription] = await this.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.accountId, accountId));

        // If multiple, we might have issues. Assuming 1 per user for now or taking first.
        // Ideally we filter by planId too if we want to allow different plans?
        // User said "pre-paid", usually implies one active line.
        // Let's keep it simple: Find by Account ID.

        // Calculate Dynamic Price
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
        const dayNames = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
        ];
        const dayName = dayNames[dayOfWeek];

        let finalPrice = Number(plan.price);
        const customPrices = plan.customPrices as Record<string, number> | null;

        // 1. Day-Specific Pricing (Overrides Base Price)
        if (customPrices && customPrices[dayName]) {
            finalPrice = Number(customPrices[dayName]); // Override base price
        }

        // 2. Add Fixed Tax
        if (plan.tax) {
            finalPrice += Number(plan.tax);
        }

        // 3. Check Inactivity Fee (if existing subscription is expired > 30 days)
        if (existingSubscription && existingSubscription.status !== 'ACTIVE') { // Only if not Active? Orcheck existing expiration?
            // Since we found an existing subscription, check its expiry.
            // If plan is pre-paid, nextBillingDate is the expiry.
            const expiryDate = new Date(existingSubscription.nextBillingDate);
            const now = new Date();

            // Calculate difference in days
            const diffTime = Math.abs(now.getTime() - expiryDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if expired AND duration > 30 days
            if (now > expiryDate && diffDays > 30 && plan.lateFeeAfter30Days) {
                finalPrice += Number(plan.lateFeeAfter30Days);
            }
        }

        // Create Payment
        const payment = await this.paymentsService.create({
            accountId,
            amount: finalPrice,
            description: `Assinatura ${plan.name} (${dayName})`,
        });

        // Link Payment to Subscription (if exists) or new Subscription ID (if created below)
        // Wait, we need subscription ID first.

        let subscriptionId = existingSubscription?.id;

        if (!existingSubscription) {
            const startDate = new Date();
            // Initial billing date is NOW because it's pre-paid and starts immediately?
            // Actually, if new, we set nextBillingDate to NOW so the processor adds interval to it?
            // No, if new, it effectively has NO valid time yet.
            // Let's set nextBillingDate to NOW.
            // And status to PENDING.

            let nextBillingDate = new Date(); // Expired/Now

            const [newSub] = await this.db
                .insert(subscriptions)
                .values({
                    accountId,
                    planId,
                    status: 'PENDING',
                    startDate,
                    nextBillingDate,
                    dueDay,
                })
                .returning();
            subscriptionId = newSub.id;
        }

        // Link Payment to Subscription
        await this.db
            .update(payments)
            .set({
                subscriptionId: subscriptionId,
            })
            .where(eq(payments.id, payment.id));

        // Return existing subscription or new one?
        // Let's re-fetch or construct return object.

        return {
            subscriptionId,
            payment,
        };
    }

    async findMySubscription(accountId: string) {
        const [subscription] = await this.db
            .select()
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.accountId, accountId),
                    eq(subscriptions.status, 'ACTIVE'),
                ),
            );

        return subscription;
    }

    private calculateNextBillingDate(
        startDate: Date,
        interval: PlanInterval,
    ): Date {
        switch (interval) {
            case PlanInterval.WEEKLY:
                return addDays(startDate, 7);
            case PlanInterval.MONTHLY:
                return addMonths(startDate, 1);
            case PlanInterval.YEARLY:
                return addYears(startDate, 1);
            case PlanInterval.DAILY:
                return addDays(startDate, 1);
            default:
                return addMonths(startDate, 1);
        }
    }
}
