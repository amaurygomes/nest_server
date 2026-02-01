import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class SignOutDto {
  @ApiProperty({
    description: 'The valid JWT access token to be invalidated or signed out',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsJWT()
  @IsNotEmpty()
  token: string;
}