import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DRIZZLE } from 'src/gateways/database/drizzle/drizzle.module';
import { eq, isNull } from 'drizzle-orm';
import type { DrizzleDb } from 'src/gateways/database/drizzle/drizzle.types';
import * as schema from 'src/gateways/database/drizzle/schema';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) { }

  async create(createAccountDto: CreateAccountDto) {
    try {
      const [account] = await this.db
        .insert(schema.accounts)
        .values(createAccountDto)
        .returning();

      return account;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Dados duplicados: CPF, E-mail ou MachineID já cadastrados.');
      }
      throw new BadRequestException('Erro ao criar conta. Verifique os dados enviados.');
    }
  }

  async findAll() {
    return await this.db
      .select()
      .from(schema.accounts)
      .where(isNull(schema.accounts.deletedAt));
  }

  async findOne(id: string) {
    const [account] = await this.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id));

    if (!account) throw new NotFoundException('Conta não encontrada.');
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    const [updatedAccount] = await this.db
      .update(schema.accounts)
      .set({
        ...updateAccountDto,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.id, id))
      .returning();

    if (!updatedAccount) throw new NotFoundException('Conta não encontrada para atualizar.');
    return updatedAccount;
  }

  async remove(id: string) {
    const [deletedAccount] = await this.db
      .update(schema.accounts)
      .set({
        deletedAt: new Date(),
        status: 'E'
      })
      .where(eq(schema.accounts.id, id))
      .returning();

    if (!deletedAccount) throw new NotFoundException('Conta não encontrada para remover.');
    
    return { success: true, message: 'Conta excluída.' };
  }
}