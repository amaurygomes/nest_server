import { IsNotEmpty, IsString } from 'class-validator';

export class LinkAccountDto {
  @IsString()
  @IsNotEmpty()
  authId: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;
}
