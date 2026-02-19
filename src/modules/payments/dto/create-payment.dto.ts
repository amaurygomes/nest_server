import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The unique identifier of the account owning this payment',
    example: 'de2cf671-a1bb-435a-a94b-769067ff868e',
  })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'The total amount of the transaction in cents',
    example: 15050,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({
    description: 'Brief description of the payment purpose',
    example: 'Premium Monthly Subscription',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
