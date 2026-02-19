import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class EfiPixNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endToEndId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  txid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  valor: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  horario: string;

  @ApiProperty({ required: false })
  @IsString()
  infoPagador?: string;
}

export class EfiWebhookDto {
  @ApiProperty({ type: [EfiPixNotificationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EfiPixNotificationDto)
  pix: EfiPixNotificationDto[];
}
