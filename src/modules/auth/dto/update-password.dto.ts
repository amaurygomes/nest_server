import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdatePasswordDto {
    @ApiProperty({ 
        description: 'The new secure password. Must meet complexity requirements: 8+ chars, upper, lower, number, and symbol.', 
        example: 'New@StrongPass2026',
        format: 'password'
    })
    @IsNotEmpty()
    @IsStrongPassword()
    password: string;
}