import { Module } from '@nestjs/common';
import { DrizzleModule } from './gateways/database/drizzle/drizzle.module';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DrizzleModule,
    AccountsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
