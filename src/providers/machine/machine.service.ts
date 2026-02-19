import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ExternalAccountDto } from './dto/external-account.dto';
import { MachineApiResponse } from './dto/machine-api-response.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { IdRequestDto } from './dto/id-request.dto';

@Injectable()
export class MachineService {
  private readonly client: AxiosInstance;

  constructor() {
    const auth = Buffer.from(
      `${process.env.MACHINE_AUTH_EMAIL}:${process.env.MACHINE_AUTH_PASSWORD}`,
    ).toString('base64');

    this.client = axios.create({
      baseURL: process.env.MACHINE_BASE_URL,
      headers: {
        Authorization: `Basic ${auth}`,
        'api-key': process.env.MACHINE_API_KEY!,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  async listAllAccounts(): Promise<ExternalAccountDto[]> {
    const list: ExternalAccountDto[] = [];
    let page = 1;

    while (true) {
      const data = await this.get<MachineApiResponse>(
        `/condutor?pagina=${page}&limite=100`,
      );
      if (
        data?.success &&
        Array.isArray(data.response) &&
        data.response.length > 0
      ) {
        list.push(...data.response);
        page++;
      } else {
        break;
      }
    }

    return list;
  }

  async getAccountData(
    idRequestDto: IdRequestDto,
  ): Promise<ExternalAccountDto | null> {
    const dados = await this.get<MachineApiResponse>(
      `/condutor/${idRequestDto.id}`,
    );
    const account = dados.success && dados.response?.[0];
    return account || null;
  }

  async updateAccountData(
    idRequestDto: IdRequestDto,
    updateAccountDto: UpdateAccountDto,
  ): Promise<void> {
    await this.post(`/atualizarCondutor/${idRequestDto.id}`, {
      id: Number(idRequestDto.id),
      ...updateAccountDto,
    });
  }

  async mapAccounts(): Promise<ExternalAccountDto[]> {
    const accounts = await this.listAllAccounts();
    const validMap = new Map<string, ExternalAccountDto>();

    for (const account of accounts) {
      const cleanCpf = account.cpf ? account.cpf.replace(/\D/g, '') : null;
      const vtr =
        account.numero_viatura && account.numero_viatura !== 'null'
          ? String(account.numero_viatura).trim()
          : null;

      if (!cleanCpf || cleanCpf.length < 11) continue;

      if (!validMap.has(cleanCpf) || vtr !== null) {
        validMap.set(cleanCpf, account);
      }
    }

    return Array.from(validMap.values()).filter(
      (acc) => acc.numero_viatura !== null,
    );
  }

  private async get<T>(path: string): Promise<T> {
    try {
      const response = await this.client.get<T>(path);
      return response.data;
    } catch (error: any) {
      this.handleAxiosError(error);
    }
  }

  private async post<T>(path: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post<T>(path, data);
      return response.data;
    } catch (error: any) {
      this.handleAxiosError(error);
    }
  }

  private handleAxiosError(error: any): never {
    if (error.response) {
      throw new HttpException(
        {
          status: error.response.status,
          data: error.response.data,
        },
        error.response.status,
      );
    }

    throw new HttpException(
      { message: 'Error connecting to Machine API', error: error.message },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
