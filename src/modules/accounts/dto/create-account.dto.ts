import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
  SUPPORT = 'SUPPORT',
}

export enum UserStatus {
  A = 'A',
  I = 'I',
  E = 'E'
}

export class CreateAccountDto {
  @IsString()
  @IsOptional()
  authId?: string;

  @IsString()
  @IsNotEmpty({ message: 'O Machine ID é obrigatório' })
  machineId: string;

  @IsString()
  @IsNotEmpty({ message: 'O CPF é obrigatório' })
  cpf: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'O número da VTR é obrigatório' })
  vtrNumber: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail obrigatório' })
  email: string;

  @IsString()
  @IsOptional()
  chavePix?: string;

  @IsEnum(UserStatus, { message: 'Status inválido. Use: A, I, E ou D' })
  @IsOptional()
  status?: UserStatus;

  @IsEnum(UserRole, { message: 'Role inválida' })
  @IsOptional()
  role?: UserRole;
}