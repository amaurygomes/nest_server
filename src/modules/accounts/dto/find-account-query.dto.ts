
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAccountQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Filter by Name (partial)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by CPF' })
    @IsOptional()
    @IsString()
    cpf?: string;

    @ApiPropertyOptional({ description: 'Filter by Email' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ description: 'Filter by Vehicle Type' })
    @IsOptional()
    @IsString()
    vehicleType?: string;

    @ApiPropertyOptional({ description: 'Filter by VTR Number' })
    @IsOptional()
    @IsString()
    vtr?: string;
}
