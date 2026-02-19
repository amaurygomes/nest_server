import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanInterval {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
    DAILY = 'DAILY',
}

export class CreatePlanDto {
    @ApiProperty({ description: 'Name of the plan', example: 'Gold Plan' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Description of the plan', example: 'Access to all features' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Price of the plan', example: 29.99 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ enum: PlanInterval, description: 'Billing interval' })
    @IsEnum(PlanInterval)
    interval: PlanInterval;

    @ApiPropertyOptional({ description: 'Daily late fee amount', example: 0.50 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    dailyLateFee?: number;

    @ApiPropertyOptional({ description: 'Late fee after 30 days', example: 10.00 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    lateFeeAfter30Days?: number;

    @ApiPropertyOptional({ description: 'Custom prices (surcharges) per day of week', example: { monday: 5, friday: 10 } })
    @IsOptional()
    customPrices?: Record<string, number>;

    @ApiPropertyOptional({ description: 'Fixed tax amount', example: 1.00 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    tax?: number;

    @ApiPropertyOptional({ description: 'Target vehicle types', example: ['MOTORCYCLE'] })
    @IsOptional()
    targetVehicleTypes?: string[];
}
