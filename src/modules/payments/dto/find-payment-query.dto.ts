import { IsOptional, IsInt, Min, IsUUID, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentMethod, PaymentStatus } from '../types/payment.types';

export class FindPaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by Account ID (UUID)',
    example: 'de2cf671-a1bb-435a-a94b-769067ff868e'
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'APPROVED'],
    example: 'PENDING'
  })
  @IsOptional()
  @IsEnum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'APPROVED'])
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: ['PIX', 'APPROVED'],
    example: 'PIX'
  })
  @IsOptional()
  @IsEnum(['PIX', 'APPROVED'])
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by external transaction ID',
    example: 'TX_123456789'
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}