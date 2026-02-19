import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
    @ApiProperty({ description: 'ID of the plan to subscribe to' })
    @IsUUID()
    @IsNotEmpty()
    planId: string;

    @ApiProperty({ description: 'ID of the account (user) to subscribe' })
    @IsUUID()
    @IsNotEmpty()
    accountId: string;

    @ApiPropertyOptional({ description: 'Preferred day of the month for billing (1-28)', example: 15 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(28)
    dueDay?: number;
}
