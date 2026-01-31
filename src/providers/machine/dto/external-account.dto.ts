import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ExternalAccountDto {
    id: string;
    nome: string;
    email: string | null;
    telefone: string;
    status: string;
    cpf: string;
    avaliacao_media: string | null;
    data_hora_ultima_corrida: string | null;
    numero_viatura: string | null;
    observacao_interna_1: string | null;
    observacao_interna_2: string | null;
    observacao_interna_3: string | null;
}