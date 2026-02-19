import { Module } from '@nestjs/common';
import { DrizzleModule } from './providers/database/drizzle/drizzle.module';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './modules/accounts/accounts.module';
import { SupabaseModule } from './providers/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { MachineModule } from './providers/machine/machine.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PaymentGatewayModule } from './providers/payment-gateways/payment-gateway.module';
import { QueueModule } from './providers/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
