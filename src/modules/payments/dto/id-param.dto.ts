import { IsNotEmpty, IsUUID } from "class-validator";

export class IdParamDto {
    @IsUUID()
    @IsNotEmpty()
    id: string;
}