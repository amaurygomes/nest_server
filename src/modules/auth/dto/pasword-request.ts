import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PasswordRequestDto {
    @ApiProperty({ 
        description: 'User email for password recovery', 
        example: 'user@example.com' 
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}