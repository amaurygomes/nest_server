import { 
  Injectable, 
  Inject, 
  ConflictException, 
  NotFoundException, 
  BadRequestException,
  InternalServerErrorException 
} from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DRIZZLE } from 'src/gateways/database/drizzle/drizzle.module';
import { eq, isNull, and } from 'drizzle-orm';
import type { DrizzleDb } from 'src/gateways/database/drizzle/drizzle.types';
import * as schema from 'src/gateways/database/drizzle/schema';
import { RequestIdDto } from './dto/request-id.dto';
import { LinkAccountDto } from './dto/link-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) { }

  async create(request: CreateAccountDto) {
    try {
      const [account] = await this.db
        .insert(schema.accounts)
        .values(request)
        .returning();

      return account;
    } catch (error: any) {
      throw new InternalServerErrorException('Error creating account');
    }
  }

  async findAll() {
    return await this.db
      .select()
      .from(schema.accounts)
      .where(isNull(schema.accounts.deletedAt));
  }

  async findOne(request: RequestIdDto) {
    const [account] = await this.db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.id, request.id),
          isNull(schema.accounts.deletedAt)
        )
      );

    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    
    return account;
  }

  async update(requestId: RequestIdDto, requestData: UpdateAccountDto) {
    try {
      const [updatedAccount] = await this.db
        .update(schema.accounts)
        .set({
          ...requestData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.accounts.id, requestId.id),
            isNull(schema.accounts.deletedAt)
          )
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

  async linkUserAccount(request: LinkAccountDto) {


    const [linkedAccount] = await this.db
      .update(schema.accounts)
      .set({
        authId: request.authId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.accounts.cpf, request.cpf),
          isNull(schema.accounts.deletedAt)
        )
      )
      .returning();

    if (!linkedAccount) {
      throw new NotFoundException('Account not found for linking.');
    }

    return linkedAccount;
  }

  async remove(request: RequestIdDto) {
    const [deletedAccount] = await this.db
      .update(schema.accounts)
      .set({
        deletedAt: new Date(),
        status: 'E'
      })
      .where(
        and(
          eq(schema.accounts.id, request.id),
          isNull(schema.accounts.deletedAt)
        )
      )
      .returning();

    if (!deletedAccount) {
      throw new NotFoundException('Account not found or already deleted.');
    }

    return { 
      success: true, 
      message: 'Account successfully deleted.' 
    };
  }
}