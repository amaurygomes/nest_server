import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';

import { AccountsController } from './accounts.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule { }
