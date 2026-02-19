import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { subscriptions, accounts, plans } from 'src/providers/database/drizzle/schema';
import { eq, and, lt, gt } from 'drizzle-orm';
import { MachineService } from 'src/providers/machine/machine.service';

@Injectable()
export class SubscriptionSyncService {
  private readonly logger = new Logger(SubscriptionSyncService.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    private readonly machineService: MachineService,
  ) {}

  // NOTE: Cron job is currently disabled as per user request to avoid production side effects.
  // Uncomment the decorator below to enable synchronization.
  // @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting Subscription Synchronization...');

    await this.syncActiveSubscriptions();
    await this.syncExpiredSubscriptions();

    this.logger.log('Subscription Synchronization Completed.');
  }

  private async syncActiveSubscriptions() {
    this.logger.debug('Syncing Active Subscriptions...');
    const now = new Date();

    // 1. Find ACTIVE subscriptions that are effectively active (NextBilling > Now)
    const activeSubs = await this.db
      .select({
        sub: subscriptions,
        machineId: accounts.machineId,
      })
      .from(subscriptions)
      .innerJoin(accounts, eq(subscriptions.accountId, accounts.id))
      .where(
        and(
          eq(subscriptions.status, 'ACTIVE'),
          gt(subscriptions.nextBillingDate, now),
        ),
      );

    for (const { sub, machineId } of activeSubs) {
      if (machineId) {
        try {
          // Force Machine to be Active
            await this.machineService.updateAccountData(
                { id: machineId },
                {
                    status_condutor: 'A',
                    observacao_interna_3: sub.nextBillingDate.toISOString(),
                }
            );
        } catch (e) {
          this.logger.error(`Failed to sync active sub ${sub.id}: ${e.message}`);
        }
      }
    }
  }

  private async syncExpiredSubscriptions() {
    this.logger.debug('Syncing Expired Subscriptions...');
    const now = new Date();

    // 2. Find subscriptions that are marked ACTIVE but have Expired (NextBilling < Now)
    const expiredActiveSubs = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'ACTIVE'),
          lt(subscriptions.nextBillingDate, now),
        ),
      );

    for (const sub of expiredActiveSubs) {
      this.logger.warn(`Subscription ${sub.id} is overdue. Marking as PAST_DUE.`);
      
      // Update DB
      await this.db
        .update(subscriptions)
        .set({ status: 'PAST_DUE', updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));

      // Block Machine
      const [account] = await this.db
        .select({ machineId: accounts.machineId })
        .from(accounts)
        .where(eq(accounts.id, sub.accountId));

      if (account && account.machineId) {
          try {
            await this.machineService.updateAccountData(
                { id: account.machineId },
                { status_condutor: 'I' }
            );
          } catch (e) {
              this.logger.error(`Failed to block machine for sub ${sub.id}: ${e.message}`);
          }
      }
    }

    // 3. Find PAST_DUE subscriptions ensuring they are blocked (Optional / Fail-safe)
    // Could iterate unrelated to active/expired transition just to ensure consistency.
  }
}
