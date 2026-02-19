import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindOnePaymentDto {
  @ApiPropertyOptional({
    description: 'The unique identifier of the account to filter the payment',
    example: '87f88d88-6b3d-49ba-b405-7f3579504ade',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
