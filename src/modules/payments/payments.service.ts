import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import type { DrizzleDb } from 'src/providers/database/drizzle/drizzle.types';
import { payments } from 'src/providers/database/drizzle/schema';
import { and, count, desc, eq, notInArray, or, SQL } from 'drizzle-orm';
import { IdParamDto } from './dto/id-param.dto';
import { PaymentDto, PaymentListDto } from './dto/payments.dto';
import { FindPaymentQueryDto } from './dto/find-payment-query.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { RefoundPaymentDto } from './dto/refound-payment.dto';
import { FindOnePaymentDto } from './dto/find-one-payment-dto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: DrizzleDb,
  ) { }

  async create(createPaymentDto: CreatePaymentDto): Promise<PaymentDto> {
    const { amount, ...paymentData } = createPaymentDto;

    const [payment] = await this.db.insert(payments).values({
      ...paymentData,
      accountId: createPaymentDto.accountId,
      amount: amount.toString(),
    }).returning();

    if (!payment) {
      throw new InternalServerErrorException('Error creating payment');
    }

    return payment;
  }

  async findAll(query: FindPaymentQueryDto): Promise<PaymentListDto> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (query.accountId) {
      filters.push(eq(payments.accountId, query.accountId));
    }

    if (query.status) {
      filters.push(eq(payments.status, query.status));
    }

    if (query.paymentMethod) {
      filters.push(eq(payments.paymentMethod, query.paymentMethod));
    }

    if (query.transactionId) {
      filters.push(eq(payments.transactionId, query.transactionId));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const dataPromise = this.db
      .select()
      .from(payments)
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPromise = this.db
      .select({ value: count() })
      .from(payments)
      .where(whereClause);

    const [allPayments, totalResult] = await Promise.all([dataPromise, totalPromise]);

    const total = Number(totalResult[0].value);
    const lastPage = Math.ceil(total / limit);

    return {
      Payments: allPayments as PaymentDto[],
      total,
      page,
      lastPage,
    };
  }

  async findOne(idParamDto: IdParamDto, findOnePaymentDto: FindOnePaymentDto): Promise<PaymentDto> {
  const { id } = idParamDto;
  const { accountId } = findOnePaymentDto;

  if (!id) {
    throw new BadRequestException('Payment ID is required');
  }

  const filters: SQL[] = [eq(payments.id, id)];

  if (accountId) {
    filters.push(eq(payments.accountId, accountId));
  }

  const [payment] = await this.db
    .select()
    .from(payments)
    .where(and(...filters));

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  return payment as PaymentDto;
}

  async update(idParamDto: IdParamDto, updatePaymentDto: UpdatePaymentDto): Promise<PaymentDto> {
    const { id } = idParamDto;

    const [updated] = await this.db.update(payments)
      .set({
        ...updatePaymentDto,
        paymentMethod: 'PIX',
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(eq(payments.id, id))
      .returning();

    return updated;
  }

  async refound(idParamDto: IdParamDto, refoundPaymentDto: RefoundPaymentDto): Promise<PaymentDto> {
    const [refunded] = await this.db.update(payments)
      .set({
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: refoundPaymentDto.refundedBy,
        refundReason: refoundPaymentDto.refundReason,
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(and(
        eq(payments.id, idParamDto.id),
        notInArray(payments.status, ['REFUNDED', 'FAILED', 'PENDING']),
      ))
      .returning();

    return refunded;
  }

  async approve(idParamDto: IdParamDto, approvePaymentDto: ApprovePaymentDto): Promise<PaymentDto> {

    const [approved] = await this.db.update(payments)
      .set({
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approvePaymentDto.approvedBy,
        paymentMethod: 'APPROVED',
        updatedAt: new Date(),
        statusSyncAt: true,
      })
      .where(and(
        eq(payments.id, idParamDto.id),
        eq(payments.status, 'PENDING'),
      ))
      .returning();

    if (!approved) {
      throw new NotFoundException(`Payment with ID ${idParamDto.id} not found`);
    }

    return approved;
  }

}