import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { SubscriptionSyncService } from './subscription-sync.service';
import { MachineModule } from 'src/providers/machine/machine.module';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    MachineModule,
  ],
  providers: [SubscriptionSyncService],
  exports: [SubscriptionSyncService],
})
export class SchedulerModule {}
