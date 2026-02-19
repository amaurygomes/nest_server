import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { Inject, Logger } from '@nestjs/common';
import { accounts, payments } from 'src/providers/database/drizzle/schema';
import { eq } from 'drizzle-orm';
import { EfiWebhookDto } from './dto/efi-webhook.dto';
import { MachineService } from 'src/providers/machine/machine.service';

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
      `Payment ${updatedPayment.id} status updated to COMPLETED. Now updating machine status.`,
    );

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

      await this.machineService.updateAccountData(
        { id: account.machineId },
        {
          status_condutor: 'A',
          observacao_interna_3: new Date().toISOString(), // Sera feito calculo ainda para vencimento
        },
      );

      this.logger.log(
        `Successfully updated machine status for machineId ${account.machineId}.`,
      );
      return {
        paymentId: updatedPayment.id,
        status: 'completed',
        machineStatus: 'updated',
      };
    } catch (error) {
      this.logger.error(
        `Failed to update machine status for payment ${updatedPayment.id}.`,
        error.stack,
      );
      throw error;
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
