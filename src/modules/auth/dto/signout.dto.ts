import { IsJWT, IsNotEmpty } from 'class-validator';

export class SignOutDto {
  @IsJWT()
  @IsNotEmpty()
  token: string;
}