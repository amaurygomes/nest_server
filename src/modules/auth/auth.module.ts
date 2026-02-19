import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsModule } from '../accounts/accounts.module';

import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [AccountsModule, LogsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
