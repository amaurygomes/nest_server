import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString, IsBoolean } from 'class-validator';
import type { PaymentMethod, PaymentStatus } from '../types/payment.types';

export class UpdatePaymentDto {
    @ApiPropertyOptional({
        description: 'Current status of the payment',
        example: 'APPROVED',
        enum: ['PENDING', 'APPROVED', 'FAILED', 'REFUNDED']
    })
    @IsOptional()
    @IsString()
    status?: PaymentStatus;

    @ApiPropertyOptional({
        description: 'Internal description or notes',
        example: 'Monthly subscription for Premium Plan'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'The date when the payment was actually processed',
        example: '2024-05-20T14:30:00Z'
    })
    @IsOptional()
    @IsDateString()
    paymentDate?: Date;

    @ApiPropertyOptional({
        description: 'The method used for the payment',
        example: 'PIX',
        enum: ['PIX', 'APPROVED']
    })
    @IsOptional()
    @IsString()
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({
        description: 'PIX Copy and Paste code',
        example: '00020126580014BR.GOV.BCB.PIX0136...'
    })
    @IsOptional()
    @IsString()
    pixCopyPaste?: string;

    @ApiPropertyOptional({
        description: 'Base64 encoded image of the PIX QR code',
        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
    })
    @IsOptional()
    @IsString()
    pixImageBase64?: string;

    @ApiPropertyOptional({
        readOnly: true,
        description: 'Name of the user who approved the payment',
        example: 'John Doe'
    })
    @IsOptional()
    @IsString()
    approvedBy?: string;

    @ApiPropertyOptional({
        description: 'The reason for the refund',
        example: 'Customer requested cancellation'
    })
    @IsOptional()
    @IsString()
    refundReason?: string;

    @ApiPropertyOptional({
        description: 'Flag to sync status with the banking system',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    statusSyncAt?: boolean;
}