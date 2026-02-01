import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ 
    description: 'National Taxpayer Registry (CPF) - numbers only', 
    example: '12345678901',
    minLength: 11,
    maxLength: 11
  })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ 
    description: 'User password. Must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol.', 
    example: 'Secure@Auth2026',
    format: 'password'
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}