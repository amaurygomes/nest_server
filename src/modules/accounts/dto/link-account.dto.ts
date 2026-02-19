import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class LinkAccountDto {
  @IsString()
  @IsNotEmpty()
  authId: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsBoolean()
  @IsNotEmpty()
  @IsOptional()
  termsAccepted?: boolean;
}
