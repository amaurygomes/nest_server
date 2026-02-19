import { Module } from '@nestjs/common';
import { DrizzleModule } from './providers/database/drizzle/drizzle.module';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AccountsModule } from './modules/accounts/accounts.module';
import { SupabaseModule } from './providers/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { MachineModule } from './providers/machine/machine.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PaymentGatewayModule } from './providers/payment-gateways/payment-gateway.module';
import { QueueModule } from './providers/queue/queue.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { LogsModule } from './modules/logs/logs.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        SUPABASE_URL: Joi.string().required(),
        SUPABASE_ROLE_KEY: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        CORS_ORIGIN: Joi.string().default('*'),
      }),
    }),
    QueueModule,
    ScheduleModule.forRoot(),
    DrizzleModule,
    AccountsModule,
    SupabaseModule,
    AuthModule,
    MachineModule,
    SchedulesModule,
    PaymentsModule,
    PaymentGatewayModule.register(),
    SubscriptionsModule,
    MetricsModule,
    LogsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
