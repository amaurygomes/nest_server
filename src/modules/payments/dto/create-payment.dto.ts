import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The unique identifier of the account owning this payment',
    example: 'de2cf671-a1bb-435a-a94b-769067ff868e'
  })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'The total amount of the transaction',
    example: 150.50
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'External gateway transaction identifier',
    example: 'TX_ORDER_998877'
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Brief description of the payment purpose',
    example: 'Premium Monthly Subscription'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'PIX Copy and Paste string for manual payment',
    example: '00020126580014BR.GOV.BCB.PIX0136...'
  })
  @IsString()
  @IsOptional()
  pixCopyPaste?: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded string of the PIX QR Code image',
    example: 'iVBORw0KGgoAAAANSUhEUgA...'
  })
  @IsString()
  @IsOptional()
  pixImageBase64?: string;
}