import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DRIZZLE } from 'src/providers/database/drizzle/drizzle.module';
import { eq, isNull, and } from 'drizzle-orm';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import * as schema from 'src/providers/database/drizzle/schema';
import { IdRequestDto } from './dto/id-request.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { AccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

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
    try {
      await this.db
        .insert(schema.accounts)
        .values(data)
        .onConflictDoNothing({ target: schema.accounts.machineId });

      return { success: true };
    } catch (error) {
      console.error('Error in bulk processing:', error);
      throw new InternalServerErrorException(
        'Error processing account batch',
      );
    }
  }

  async findAll() {
    return await this.db
      .select()
      .from(schema.accounts)
      .where(isNull(schema.accounts.deletedAt));
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
      const [updatedAccount] = await this.db
        .update(schema.accounts)
        .set({
          ...updateAccountDto,
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
