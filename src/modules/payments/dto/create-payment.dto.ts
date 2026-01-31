import { 
  IsNotEmpty, 
  IsNumber, 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsEnum, 
  Min 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type PaymentMethod = 'PIX' | 'APPROVED';

export class CreatePaymentDto {
  @ApiProperty({ example: 'de2cf671-a1bb-435a-a94b-769067ff868e' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: 150.50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'PIX', enum: ['PIX', 'APPROVED'] })
  @IsEnum(['PIX', 'APPROVED'])
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'ID_TRANSACAO_12345' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ example: 'Trial Subscription' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Code Copy Paste PIX' })
  @IsString()
  @IsOptional()
  pixCopyPaste?: string;

  @ApiPropertyOptional({ example: 'Code Imagem Base64 do PIX' })
  @IsString()
  @IsOptional()
  pixImageBase64?: string;
}