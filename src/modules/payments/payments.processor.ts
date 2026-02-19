import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { Inject, Logger } from '@nestjs/common';
import {
  accounts,
  payments,
  subscriptions,
  plans,
} from 'src/providers/database/drizzle/schema';
import { eq } from 'drizzle-orm';
import { EfiWebhookDto } from './dto/efi-webhook.dto';
import { MachineService } from 'src/providers/machine/machine.service';
import { addDays, addMonths, addYears, format } from 'date-fns';

@Processor('payment-updates')
export class PaymentsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
    private readonly machineService: MachineService,
  ) {
    super();
  }

  async process(job: Job<EfiWebhookDto, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

    const payload = job.data;
    const pixNotification = payload.pix?.[0];

    if (!pixNotification || !pixNotification.txid) {
      this.logger.warn(`Job ${job.id} has invalid payload. Skipping.`);
      return { status: 'skipped', reason: 'Invalid payload' };
    }

    const { txid } = pixNotification;

    const [updatedPayment] = await this.db
      .update(payments)
      .set({
        status: 'COMPLETED',
        paymentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.transactionId, txid))
      .returning();

    if (!updatedPayment) {
      this.logger.error(
        `No payment found with txid: ${txid}. Job ${job.id} failed.`,
      );
      throw new Error(`Payment with txid ${txid} not found.`);
    }

    this.logger.log(
      `Payment ${updatedPayment.id} status updated to COMPLETED.`,
    );

    let newExpiryDate: Date | null = null;
    let machineIdToUpdate: string | null = null;

    // Handle Subscription Activation & Extension
    if (updatedPayment.subscriptionId) {
      this.logger.log(
        `Payment ${updatedPayment.id} appears linked to subscription ${updatedPayment.subscriptionId}. Processing renewal...`,
      );

      // Fetch Subscription and Plan
      const [subscription] = await this.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, updatedPayment.subscriptionId));

      if (subscription) {
        const [plan] = await this.db
          .select()
          .from(plans)
          .where(eq(plans.id, subscription.planId));

        if (plan) {
          // Calculate New Expiry Date (Cumulative Pre-Paid Logic)
          const now = new Date();
          let baseDate = now;

          // If subscription is active and has future expiration, add to it.
          if (
            subscription.status === 'ACTIVE' &&
            subscription.nextBillingDate > now
          ) {
            baseDate = new Date(subscription.nextBillingDate);
          }

          newExpiryDate = this.calculateNewDate(baseDate, plan.interval);

          await this.db
            .update(subscriptions)
            .set({
              status: 'ACTIVE',
              nextBillingDate: newExpiryDate,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

          this.logger.log(
            `Subscription ${subscription.id} extended to ${newExpiryDate.toISOString()}.`,
          );
        } else {
          this.logger.error(`Plan not found for subscription ${subscription.id}`);
        }
      } else {
        this.logger.error(`Subscription ${updatedPayment.subscriptionId} not found`);
      }
    }

    this.logger.log('Now updating machine status.');

    try {
      const [account] = await this.db
        .select({ machineId: accounts.machineId })
        .from(accounts)
        .where(eq(accounts.id, updatedPayment.accountId));

      if (!account || !account.machineId) {
        this.logger.warn(
          `Account for payment ${updatedPayment.id} has no machineId. Skipping machine update.`,
        );
        return {
          paymentId: updatedPayment.id,
          status: 'completed',
          machineStatus: 'skipped',
        };
      }

      machineIdToUpdate = account.machineId;

      // Update Machine
      const updateData: any = {
        status_condutor: 'A',
      };

      if (newExpiryDate) {
        updateData.observacao_interna_3 = format(newExpiryDate, 'dd/MM/yyyy HH:mm:ss');
      }

      await this.machineService.updateAccountData(
        { id: account.machineId },
        updateData,
      );

      this.logger.log(
        `Successfully updated machine status for machineId ${account.machineId}.`,
      );
      return {
        paymentId: updatedPayment.id,
        status: 'completed',
        machineStatus: 'updated',
        newExpiry: newExpiryDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update machine status for payment ${updatedPayment.id}.`,
        error.stack,
      );
      throw error;
    }
  }

  private calculateNewDate(startDate: Date, interval: string): Date {
    switch (interval) {
      case 'WEEKLY':
        return addDays(startDate, 7);
      case 'MONTHLY':
        return addMonths(startDate, 1);
      case 'YEARLY':
        return addYears(startDate, 1);
      case 'DAILY':
        return addDays(startDate, 1);
      default:
        return addMonths(startDate, 1);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `Job ${job.id} completed successfully. Result: ${JSON.stringify(result)}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${err.message}`,
      err.stack,
    );
  }
}
