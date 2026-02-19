import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
