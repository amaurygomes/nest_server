import { IsNotEmpty, IsString } from 'class-validator';

export class IdRequestDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
