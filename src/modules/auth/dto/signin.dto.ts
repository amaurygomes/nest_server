import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}