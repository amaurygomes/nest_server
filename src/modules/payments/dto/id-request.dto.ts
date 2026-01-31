import { IsNotEmpty, IsUUID } from "class-validator";

export class IdRequestDto {
    @IsUUID()
    @IsNotEmpty()
    id: string;
}