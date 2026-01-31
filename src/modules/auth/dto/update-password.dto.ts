import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class UpdatePasswordDto {
    @IsNotEmpty()
    @IsStrongPassword()
    password: string;

}