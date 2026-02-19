import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
  SUPPORT = 'SUPPORT',
}

export enum UserStatus {
  A = 'A', // Ativo
  I = 'I', // Inativo
  E = 'E', // Em Análise
  S = 'S', // Suspenso
  R = 'R', // Rejeitado
  F = 'F', // Fila de Espera
}

export class CreateAccountDto {
  @IsString()
  @IsOptional()
  authId?: string;

  @IsString()
  @IsNotEmpty()
  machineId: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  vtrNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  chavePix?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
