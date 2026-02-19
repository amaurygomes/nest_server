import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { DrizzleModule } from 'src/providers/database/drizzle/drizzle.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule for AuthGuard if needed

import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DrizzleModule, AuthModule, PaymentsModule],
    controllers: [SubscriptionsController],
    providers: [SubscriptionsService],
    exports: [SubscriptionsService],
})
export class SubscriptionsModule { }
