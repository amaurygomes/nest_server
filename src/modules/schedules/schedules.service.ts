import { Injectable, Inject, Logger } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { MachineService } from 'src/providers/machine/machine.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { subscriptions, accounts, plans } from 'src/providers/database/drizzle/schema';
import { eq, and, lt, gt, inArray, or } from 'drizzle-orm';
import { format } from 'date-fns';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    private readonly accountsService: AccountsService,
    private readonly machineService: MachineService,
  ) { }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleSyncAccounts() {
    const accountsToSync = await this.machineService.mapAccounts();
    if (!accountsToSync.length) return;

    const formattedData = accountsToSync.map((acc) => ({
      machineId: acc.id,
      cpf: acc.cpf,
      name: acc.nome,
      vtrNumber: acc.numero_viatura || '',
      email: acc.email || '',
      status: 'A',
      role: 'USER',
    }));

    const chunkSize = 500;
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);

      try {
        await this.accountsService.bulkCreate(chunk);
      } catch (error) {
        console.error('Failed to process specific batch:', error);
      }
    }
  }


  // @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionSync() {
    this.logger.log('Starting Subscription Synchronization...');

    await this.syncExemptUsers(); // Priority: Sync Exempt Users first
    await this.syncActiveSubscriptions();
    await this.syncExpiredSubscriptions();

    this.logger.log('Subscription Synchronization Completed.');
  }

  private async syncExemptUsers() {
    this.logger.debug('Syncing Exempt Users (isPartner OR Privileged Role)...');

    const exemptUsers = await this.db
      .select({
        id: accounts.id,
        machineId: accounts.machineId,
        role: accounts.role
      })
      .from(accounts)
      .where(
        or(
          eq(accounts.isPartner, true),
          inArray(accounts.role, ['OWNER', 'ADMIN', 'SUPPORT'])
        )
      );

    for (const user of exemptUsers) {
      if (user.machineId) {
        try {
          // Force Active Status for Exempt Users
          await this.machineService.updateAccountData(
            { id: user.machineId },
            {
              status_condutor: 'A',
              // Optional: Set a far future date or just keep it active. 
              // Using a far future date ensures it doesn't look "expired" in the machine if it checks dates.
              observacao_interna_3: format(new Date('2099-12-31'), 'dd/MM/yyyy HH:mm:ss')
            }
          );
        } catch (e) {
          this.logger.error(`Failed to sync exempt user ${user.id}: ${e.message}`);
        }
      }
    }
  }

  private async syncActiveSubscriptions() {
    this.logger.debug('Syncing Active Subscriptions...');
    const now = new Date();

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
          await this.machineService.updateAccountData(
            { id: machineId },
            {
              status_condutor: 'A',
              observacao_interna_3: format(sub.nextBillingDate, 'dd/MM/yyyy HH:mm:ss'),
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

      await this.db
        .update(subscriptions)
        .set({ status: 'PAST_DUE', updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));

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
  }
}
