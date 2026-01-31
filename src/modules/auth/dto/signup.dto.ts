import { IsNotEmpty, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
