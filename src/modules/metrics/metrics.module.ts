
import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DrizzleModule } from 'src/providers/database/drizzle/drizzle.module';
import { SupabaseModule } from 'src/providers/supabase/supabase.module';

@Module({
  imports: [DrizzleModule, SupabaseModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule { }
