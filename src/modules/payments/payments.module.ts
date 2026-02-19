import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsProcessor } from './payments.processor';
import { MachineModule } from 'src/providers/machine/machine.module';

import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    LogsModule,
    MachineModule,
    BullModule.registerQueue({
      name: 'payment-updates',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, PaymentsProcessor],
  exports: [PaymentsService],
})
export class PaymentsModule { }
