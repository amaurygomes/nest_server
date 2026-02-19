
import { Injectable, Inject } from '@nestjs/common';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { DRIZZLE } from 'src/providers/database/drizzle/drizzle.module';
import { accounts, payments, subscriptions, plans } from 'src/providers/database/drizzle/schema';
import { count, eq, sum, and, sql, desc, gte } from 'drizzle-orm';
import { startOfMonth, subDays, format } from 'date-fns';

@Injectable()
export class MetricsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DrizzleDb,
    ) { }

    async getFinancialMetrics() {
        // Total Revenue (Completed/Approved payments)
        const [totalRevResult] = await this.db
            .select({ value: sum(payments.amount) })
            .from(payments)
            .where(
                sql`${payments.status} IN ('COMPLETED', 'APPROVED')`
            );
        const totalRevenue = Number(totalRevResult?.value || 0);

        // Monthly Revenue (Current Month)
        const startOfCurrentMonth = startOfMonth(new Date());
        const [monthlyRevResult] = await this.db
            .select({ value: sum(payments.amount) })
            .from(payments)
            .where(
                and(
                    sql`${payments.status} IN ('COMPLETED', 'APPROVED')`,
                    gte(payments.createdAt, startOfCurrentMonth)
                )
            );
        const monthlyRevenue = Number(monthlyRevResult?.value || 0);

        // Total Transactions Count
        const [totalTxResult] = await this.db
            .select({ value: count() })
            .from(payments)
            .where(sql`${payments.status} IN ('COMPLETED', 'APPROVED')`);
        const totalTransactions = Number(totalTxResult?.value || 0);

        // Average Ticket
        const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        // MRR Approximation
        const activeSubs = await this.db
            .select({
                price: plans.price,
                interval: plans.interval
            })
            .from(subscriptions)
            .innerJoin(plans, eq(subscriptions.planId, plans.id))
            .where(eq(subscriptions.status, 'ACTIVE'));

        let mrr = 0;
        for (const sub of activeSubs) {
            const price = Number(sub.price);
            if (sub.interval === 'WEEKLY') {
                mrr += price * 4;
            } else if (sub.interval === 'DAILY') {
                mrr += price * 30;
            } else if (sub.interval === 'YEARLY') {
                mrr += price / 12;
            } else {
                mrr += price;
            }
        }

        // Revenue by Vehicle Type
        const revenueByVehicle = await this.db
            .select({
                vehicleType: accounts.vehicleType,
                total: sum(payments.amount)
            })
            .from(payments)
            .innerJoin(accounts, eq(payments.accountId, accounts.id))
            .where(sql`${payments.status} IN ('COMPLETED', 'APPROVED')`)
            .groupBy(accounts.vehicleType);

        // Revenue by Plan
        const revenueByPlan = await this.db
            .select({
                planName: plans.name,
                total: sum(payments.amount)
            })
            .from(payments)
            .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
            .innerJoin(plans, eq(subscriptions.planId, plans.id))
            .where(sql`${payments.status} IN ('COMPLETED', 'APPROVED')`)
            .groupBy(plans.name);

        return {
            totalRevenue,
            monthlyRevenue,
            averageTicket,
            mrr,
            revenueByVehicle: revenueByVehicle.map(r => ({ type: r.vehicleType || 'Unknown', value: Number(r.total) })),
            revenueByPlan: revenueByPlan.map(r => ({ plan: r.planName, value: Number(r.total) })),
        };
    }

    async getUserMetrics() {
        const [totalUsers] = await this.db.select({ value: count() }).from(accounts).where(sql`${accounts.deletedAt} IS NULL`);

        const usersByStatus = await this.db
            .select({
                status: accounts.status,
                count: count()
            })
            .from(accounts)
            .where(sql`${accounts.deletedAt} IS NULL`)
            .groupBy(accounts.status);

        const usersByVehicle = await this.db
            .select({
                vehicleType: accounts.vehicleType,
                count: count()
            })
            .from(accounts)
            .where(sql`${accounts.deletedAt} IS NULL`)
            .groupBy(accounts.vehicleType);

        const activeUsers = usersByStatus.find(u => u.status === 'A')?.count || 0;

        return {
            totalUsers: Number(totalUsers.value),
            activeUsers: Number(activeUsers),
            byStatus: usersByStatus.map(u => ({ status: u.status, count: Number(u.count) })),
            byVehicle: usersByVehicle.map(u => ({ type: u.vehicleType, count: Number(u.count) })),
        };
    }

    async getSubscriptionMetrics() {
        const [totalActive] = await this.db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, 'ACTIVE'));

        const byPlan = await this.db
            .select({
                planName: plans.name,
                count: count()
            })
            .from(subscriptions)
            .innerJoin(plans, eq(subscriptions.planId, plans.id))
            .where(eq(subscriptions.status, 'ACTIVE'))
            .groupBy(plans.name);

        // Churn Rate Calculation (Last 30 days)
        // (Cancelled + Past Due) / (Total Active 30 days ago + New Subs) - simplified: just count Cancelled/PastDue in last 30d
        const thirtyDaysAgo = subDays(new Date(), 30);
        const [churnCount] = await this.db
            .select({ value: count() })
            .from(subscriptions)
            .where(
                and(
                    sql`${subscriptions.status} IN ('CANCELLED', 'PAST_DUE')`,
                    gte(subscriptions.updatedAt, thirtyDaysAgo)
                )
            );

        return {
            activeSubscriptions: Number(totalActive.value),
            byPlan: byPlan.map(p => ({ name: p.planName, count: Number(p.count) })),
            churnCountLast30Days: Number(churnCount.value)
        };
    }

    async getRevenueChart() {
        const thirtyDaysAgo = subDays(new Date(), 30);

        const distinctDates = await this.db
            .select({
                date: sql`DATE(${payments.createdAt})`.as('date'),
                total: sum(payments.amount)
            })
            .from(payments)
            .where(
                and(
                    sql`${payments.status} IN ('COMPLETED', 'APPROVED')`,
                    gte(payments.createdAt, thirtyDaysAgo)
                )
            )
            .groupBy(sql`DATE(${payments.createdAt})`)
            .orderBy(sql`DATE(${payments.createdAt})`);

        return distinctDates.map(d => ({
            date: d.date, // string YYYY-MM-DD
            value: Number(d.total)
        }));
    }

    async getTopDrivers() {
        const topDrivers = await this.db
            .select({
                name: accounts.name,
                vehicleType: accounts.vehicleType,
                status: accounts.status,
                totalPaid: sum(payments.amount),
                txCount: count(payments.id),
            })
            .from(payments)
            .innerJoin(accounts, eq(payments.accountId, accounts.id))
            .where(sql`${payments.status} IN ('COMPLETED', 'APPROVED')`)
            .groupBy(accounts.id, accounts.name, accounts.vehicleType, accounts.status)
            .orderBy(desc(sum(payments.amount)))
            .limit(10);

        return topDrivers.map(d => ({
            name: d.name,
            vehicleType: d.vehicleType,
            status: d.status,
            totalPaid: Number(d.totalPaid),
            txCount: Number(d.txCount)
        }));
    }
}
