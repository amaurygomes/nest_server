import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { accounts, payments, subscriptions, plans } from 'src/providers/database/drizzle/schema';
import { and, count, desc, eq, notInArray, SQL } from 'drizzle-orm';
import { IdParamDto } from './dto/id-param.dto';
import { PaymentDto, PaymentListDto } from './dto/payments.dto';
import { addDays, addMonths, addYears, subDays, subMonths, subYears, format } from 'date-fns';
import { MachineService } from 'src/providers/machine/machine.service';
import { FindPaymentQueryDto } from './dto/find-payment-query.dto';
import { RefoundPaymentDto } from './dto/refound-payment.dto';
import { FindOnePaymentDto } from './dto/find-one-payment-dto';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from 'src/providers/payment-gateways/payment-gateway.interface';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly machineService: MachineService,
    private readonly logsService: LogsService,
  ) { }

  /**
   * Creates a new Payment Charge via the Payment Gateway (PIX).
   * @param createPaymentDto - Payment details.
   */
  async create(createPaymentDto: CreatePaymentDto): Promise<PaymentDto> {
    const { accountId, amount, description } = createPaymentDto;

    const [account] = await this.db
      .select({
        name: accounts.name,
        cpf: accounts.cpf,
        email: accounts.email,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId));

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    try {
      const charge = await this.paymentGateway.createCharge({
        value: amount,
        description,
        customer: {
          name: account.name,
          document: account.cpf,
          email: account.email,
        },
      });

      const [payment] = await this.db
        .insert(payments)
        .values({
          accountId,
          amount: (amount / 100).toFixed(2),
          description,
          transactionId: charge.transactionId,
          status: 'PENDING',
          paymentMethod: 'PIX',
          pixCopyPaste: charge.qrCode,
          pixImageBase64: charge.qrCodeImageBase64,
        })
        .returning();

      if (!payment) {
        throw new InternalServerErrorException(
          'Failed to save payment record after creating charge.',
        );
      }

      // Log Creation
      await this.logsService.logUserAction(
        accountId,
        'CREATE_PAYMENT',
        `Generated PIX payment of R$ ${(amount / 100).toFixed(2)}`
      );

      return payment;
    } catch (error) {
      console.error('Error creating payment charge:', error);
      throw new InternalServerErrorException(
        'Error creating payment charge with gateway.',
      );
    }
  }

  /**
   * Retrieves a paginated list of payments with filters.
   * @param query - Filter parameters.
   */
  async findAll(query: FindPaymentQueryDto): Promise<PaymentListDto> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (query.accountId) {
      filters.push(eq(payments.accountId, query.accountId));
    }

    if (query.status) {
      filters.push(eq(payments.status, query.status));
    }

    if (query.paymentMethod) {
      filters.push(eq(payments.paymentMethod, query.paymentMethod));
    }

    if (query.transactionId) {
      filters.push(eq(payments.transactionId, query.transactionId));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const dataPromise = this.db
      .select()
      .from(payments)
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPromise = this.db
      .select({ value: count() })
      .from(payments)
      .where(whereClause);

    const [allPayments, totalResult] = await Promise.all([
      dataPromise,
      totalPromise,
    ]);

    const total = Number(totalResult[0].value);
    const lastPage = Math.ceil(total / limit);

    return {
      Payments: allPayments as PaymentDto[],
      total,
      page,
      lastPage,
    };
  }

  /**
   * Finds a specific payment by ID.
   * @param idParamDto - Payment ID.
   * @param findOnePaymentDto - Optional filters.
   */
  async findOne(
    idParamDto: IdParamDto,
    findOnePaymentDto: FindOnePaymentDto,
  ): Promise<PaymentDto> {
    const { id } = idParamDto;
    const { accountId } = findOnePaymentDto;

    if (!id) {
      throw new BadRequestException('Payment ID is required');
    }

    const filters: SQL[] = [eq(payments.id, id)];

    if (accountId) {
      filters.push(eq(payments.accountId, accountId));
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(and(...filters));

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment as PaymentDto;
  }

  /**
   * Updates a payment record.
   * @param idParamDto - Payment ID.
   * @param updatePaymentDto - Data to update.
   */
  async update(
    idParamDto: IdParamDto,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentDto> {
    const { id } = idParamDto;

    const [updated] = await this.db
      .update(payments)
      .set({
        ...updatePaymentDto,
        paymentMethod: 'PIX',
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(eq(payments.id, id))
      .returning();

    // Log Update
    await this.logsService.logUserAction(
      updated.accountId,
      'UPDATE_PAYMENT',
      `Payment ${id} updated via API`
    );

    return updated;
  }

  /**
   * Refunds a payment and reverts any associated subscription changes.
   * @param idParamDto - Payment ID.
   * @param refoundPaymentDto - Refund reasoning and actor.
   */
  async refound(
    idParamDto: IdParamDto,
    refoundPaymentDto: RefoundPaymentDto,
  ): Promise<PaymentDto> {
    const [refunded] = await this.db
      .update(payments)
      .set({
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: refoundPaymentDto.refundedBy,
        refundReason: refoundPaymentDto.refundReason,
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(
        and(
          eq(payments.id, idParamDto.id),
          notInArray(payments.status, ['REFUNDED', 'FAILED', 'PENDING']),
        ),
      )
      .returning();

    if (refunded && refunded.subscriptionId) {
      // Revert Subscription
      const [subscription] = await this.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, refunded.subscriptionId));

      if (subscription) {
        const [plan] = await this.db
          .select()
          .from(plans)
          .where(eq(plans.id, subscription.planId));

        if (plan) {
          // Calculate new expiry (Subtract time)
          let newExpiry = new Date(subscription.nextBillingDate);

          switch (plan.interval) {
            case 'WEEKLY':
              newExpiry = subDays(newExpiry, 7);
              break;
            case 'MONTHLY':
              newExpiry = subMonths(newExpiry, 1);
              break;
            case 'YEARLY':
              newExpiry = subYears(newExpiry, 1);
              break;
            case 'DAILY':
              newExpiry = subDays(newExpiry, 1);
              break;
          }
          const now = new Date();
          const isPastDue = newExpiry < now;
          const newStatus = isPastDue ? 'PAST_DUE' : 'ACTIVE';

          await this.db.update(subscriptions).set({
            nextBillingDate: newExpiry,
            status: newStatus,
            updatedAt: new Date(),
          }).where(eq(subscriptions.id, subscription.id));

          // Update Machine with New Date and Status
          const [account] = await this.db
            .select({ machineId: accounts.machineId })
            .from(accounts)
            .where(eq(accounts.id, subscription.accountId));

          if (account && account.machineId) {
            await this.machineService.updateAccountData(
              { id: account.machineId },
              {
                status_condutor: isPastDue ? 'I' : 'A', // Block if expired, Keep Active if validated
                observacao_interna_3: format(newExpiry, 'dd/MM/yyyy HH:mm:ss') // Always update the date
              }
            );
          }
        }
      }
    }

    // Log Refund
    if (refunded) {
      await this.logsService.logUserAction(
        refunded.accountId,
        'REFUND_PAYMENT',
        `Refunded R$ ${refunded.amount}. Reason: ${refoundPaymentDto.refundReason}`
      );
    }

    return refunded;
  }

  /**
   * Manually approves a pending payment.
   * @param idParamDto - Payment ID.
   * @param approvedBy - ID of the admin approving the payment.
   */
  async approve(
    idParamDto: IdParamDto,
    approvedBy: string,
  ): Promise<PaymentDto> {
    const [approved] = await this.db
      .update(payments)
      .set({
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approvedBy,
        paymentMethod: 'APPROVED',
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(
        and(eq(payments.id, idParamDto.id), eq(payments.status, 'PENDING')),
      )
      .returning();

    if (!approved) {
      throw new NotFoundException(`Payment with ID ${idParamDto.id} not found`);
    }

    // Log Approval
    await this.logsService.logUserAction(
      approved.accountId,
      'APPROVE_PAYMENT',
      `Payment ${idParamDto.id} approved manually by ${approvedBy}`
    );

    return approved;
  }
}
