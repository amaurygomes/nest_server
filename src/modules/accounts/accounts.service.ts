import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DRIZZLE } from 'src/providers/database/drizzle/drizzle.module';
import { eq, isNull, and, sql } from 'drizzle-orm';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import * as schema from 'src/providers/database/drizzle/schema';
import { IdRequestDto } from './dto/id-request.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { AccountDto } from './dto/account.dto';
import { FindAccountQueryDto } from './dto/find-account-query.dto';
import { count, desc, ilike, SQL } from 'drizzle-orm';
import { MachineService } from 'src/providers/machine/machine.service';
import { UserStatus } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    private readonly machineService: MachineService,
  ) { }

  async create(createAccountDto: CreateAccountDto) {
    try {
      const [account] = await this.db
        .insert(schema.accounts)
        .values(createAccountDto)
        .returning();

      return account;
    } catch (error: any) {
      throw new InternalServerErrorException('Error creating account');
    }
  }

  async bulkCreate(data: any[]) {
    if (data.length === 0) {
      return { success: true, message: 'No accounts to process.' };
    }

    try {
      await this.db
        .insert(schema.accounts)
        .values(data)
        .onConflictDoUpdate({
          target: schema.accounts.machineId,
          set: {
            name: sql.raw('excluded.name'),
            cpf: sql.raw('excluded.cpf'),
            vtrNumber: sql.raw('excluded.vtr_number'),
            email: sql.raw('excluded.email'),
            chavePix: sql.raw('excluded.chave_pix'),
            status: sql.raw('excluded.status'),
            updatedAt: new Date(),
          },
        });

      return { success: true };
    } catch (error) {
      console.error('Error in bulk processing:', error);
      throw new InternalServerErrorException('Error processing account batch');
    }
  }

  async findAll(query: FindAccountQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [isNull(schema.accounts.deletedAt)];

    if (query.name) {
      filters.push(ilike(schema.accounts.name, `%${query.name}%`));
    }

    if (query.cpf) {
      filters.push(eq(schema.accounts.cpf, query.cpf));
    }

    if (query.email) {
      filters.push(ilike(schema.accounts.email, `%${query.email}%`));
    }

    if (query.vehicleType) {
      filters.push(eq(schema.accounts.vehicleType, query.vehicleType as any));
    }

    if (query.vtr) {
      // VTR Number typically needs exact match or loose? User said "Search by VTR".
      // Usually VTR is short, so maybe exact or ilike. Let's use ilike for flexibility.
      filters.push(ilike(schema.accounts.vtrNumber, `%${query.vtr}%`));
    }

    const whereClause = and(...filters);

    const dataPromise = this.db
      .select()
      .from(schema.accounts)
      .where(whereClause)
      .orderBy(desc(schema.accounts.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPromise = this.db
      .select({ value: count() })
      .from(schema.accounts)
      .where(whereClause);

    const [accounts, totalResult] = await Promise.all([
      dataPromise,
      totalPromise,
    ]);

    const total = Number(totalResult[0].value);
    const lastPage = Math.ceil(total / limit);

    return {
      data: accounts as AccountDto[],
      total,
      page,
      lastPage,
      limit,
    };
  }

  async findOne(idRequestDto: IdRequestDto): Promise<AccountDto> {
    const [account] = await this.db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.machineId, idRequestDto.id),
          isNull(schema.accounts.deletedAt),
        ),
      );

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    return account as AccountDto;
  }

  async update(idRequestDto: IdRequestDto, updateAccountDto: UpdateAccountDto) {
    try {
      const { vehicleType, status, ...rest } = updateAccountDto;

      const [updatedAccount] = await this.db
        .update(schema.accounts)
        .set({
          ...rest,
          status: status, // Status update
          vehicleType: vehicleType as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.accounts.id, idRequestDto.id),
            isNull(schema.accounts.deletedAt),
          ),
        )
        .returning();

      if (!updatedAccount) {
        throw new NotFoundException('Account not found for update.');
      }

      // SYNC WITH MACHINE
      if (updatedAccount.machineId) {
        try {
          await this.machineService.updateAccountData(
            { id: updatedAccount.machineId },
            {
              nome: updateAccountDto.name,
              email: updateAccountDto.email,
              numero_viatura: updateAccountDto.vtrNumber,
              // Mapping local status to machine status.
              // A -> A (Ativo)
              // I -> I (Inativo)
              // E -> E (Em Análise)
              // S -> S (Suspenso)
              // R -> R (Rejeitado)
              // F -> F (Fila de Espera)
              status_condutor: status ? status : undefined
            }
          );
        } catch (syncError) {
          console.error('Failed to sync account update with Machine:', syncError);
          // We don't fail the written update, just log the sync failure.
        }
      }

      return updatedAccount;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating account.');
    }
  }

  async linkUserAccount(linkAccountDto: LinkAccountDto) {
    const [linkedAccount] = await this.db
      .update(schema.accounts)
      .set({
        authId: linkAccountDto.authId,
        updatedAt: new Date(),
        ...(linkAccountDto.vehicleType ? { vehicleType: linkAccountDto.vehicleType as any } : {}),
      })
      .where(
        and(
          eq(schema.accounts.cpf, linkAccountDto.cpf),
          isNull(schema.accounts.deletedAt),
        ),
      )
      .returning();

    if (!linkedAccount) {
      throw new NotFoundException('Account not found for linking.');
    }

    return linkedAccount;
  }

  async remove(idRequestDto: IdRequestDto) {
    const [deletedAccount] = await this.db
      .update(schema.accounts)
      .set({
        deletedAt: new Date(),
        status: 'E',
      })
      .where(
        and(
          eq(schema.accounts.id, idRequestDto.id),
          isNull(schema.accounts.deletedAt),
        ),
      )
      .returning();

    if (!deletedAccount) {
      throw new NotFoundException('Account not found or already deleted.');
    }

    return {
      success: true,
      message: 'Account successfully deleted.',
    };
  }
}
