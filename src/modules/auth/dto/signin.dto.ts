import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    description: 'User registration number (CPF)',
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({
    description: 'User secure password',
    example: 'Strong@Pass123',
    format: 'password',
  })
  @IsStrongPassword(
    {},
    {
      message:
        'Password is too weak. It must contain at least 8 characters, including uppercase, numbers, and symbols.',
    },
  )
  @IsNotEmpty()
  password: string;
}
