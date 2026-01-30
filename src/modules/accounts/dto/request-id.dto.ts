import { IsNotEmpty, IsString } from "class-validator";

export class RequestIdDto {
    @IsString()
    @IsNotEmpty()
    id: string
}