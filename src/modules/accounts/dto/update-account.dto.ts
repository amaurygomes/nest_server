import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, [
    'machineId', 
    'vtrNumber', 
    'cpf', 
    'authId'
  ] as const),
) {}