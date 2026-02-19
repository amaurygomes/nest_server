import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';

import { AccountsController } from './accounts.controller';
import { LogsModule } from '../logs/logs.module';
import { MachineModule } from 'src/providers/machine/machine.module';

@Module({
  imports: [LogsModule, MachineModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule { }
