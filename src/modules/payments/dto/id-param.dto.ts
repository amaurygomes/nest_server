import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamDto {
  @ApiProperty({
    description: 'The unique identifier (UUID) of the resource',
    example: 'de2cf671-a1bb-435a-a94b-769067ff868e',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
