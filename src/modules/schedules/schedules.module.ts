import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { AccountsModule } from '../accounts/accounts.module';
import { MachineModule } from 'src/providers/machine/machine.module';

@Module({
  imports: [AccountsModule, MachineModule],
  providers: [SchedulesService],
})
export class SchedulesModule {}
