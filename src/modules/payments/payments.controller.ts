import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { IdParamDto } from './dto/id-param.dto';
import { FindPaymentQueryDto } from './dto/find-payment-query.dto';
import { PaymentDto, PaymentListDto } from './dto/payments.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FindOnePaymentDto } from './dto/find-one-payment-dto';
import { RefoundPaymentDto } from './dto/refound-payment.dto';

@ApiTags('Payments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post()
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Registers a new payment. Non-privileged users have their account ID automatically assigned from their session.',
  })
  async create(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentDto> {
    const { accountId } = req.user;
    const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

    if (isPrivileged && !createPaymentDto.accountId) {
      throw new BadRequestException(
        'AccountId not provided for privileged user',
      );
    }

    const data = {
      ...createPaymentDto,
      accountId: isPrivileged ? createPaymentDto.accountId : accountId,
    };

    return this.paymentsService.create(data);
  }

  @Get()
  @ApiOperation({
    summary: 'List all payments',
    description:
      'Retrieves a paginated list of payments. Regular users can only see their own payments, while admins can filter by any account.',
  })
  async findAll(
    @Request() req,
    @Query() findPaymentQueryDto: FindPaymentQueryDto,
  ): Promise<PaymentListDto> {
    const { accountId } = req.user;
    const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

    const data = {
      ...findPaymentQueryDto,
      accountId: isPrivileged ? findPaymentQueryDto.accountId : accountId,
    };

    return this.paymentsService.findAll(data);
  }

  @Post(':id')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Returns the details of a specific payment ID if the user has permission to access it.',
  })
  async findOne(
    @Request() req,
    @Param() idParamDto: IdParamDto,
    @Body() findOnePaymentDto: FindOnePaymentDto = {},
  ): Promise<PaymentDto> {
    const { accountId } = req.user;
    const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

    const data: FindOnePaymentDto = {
      accountId: isPrivileged
        ? findOnePaymentDto?.accountId || undefined
        : accountId,
    };

    return this.paymentsService.findOne(idParamDto, data);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve payment',
    description:
      'Manual approval of a pending payment. Restricted to users with OWNER, ADMIN, or SUPPORT roles.',
  })
  async approve(
    @Request() req,
    @Param() idParamDto: IdParamDto,
  ): Promise<PaymentDto> {
    const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

    if (!isPrivileged) {
      throw new ForbiddenException(
        'User does not have permission to approve payments',
      );
    }

    const approvedBy = req.user.id;

    return this.paymentsService.approve(idParamDto, approvedBy);
  }

  @Post(':id/refund')
  @ApiOperation({
    summary: 'Refund payment',
    description:
      'Refund a payment. Restricted to users with OWNER, ADMIN, or SUPPORT roles.',
  })
  async refund(
    @Request() req,
    @Param() idParamDto: IdParamDto,
    @Body() refoundPaymentDto: RefoundPaymentDto,
  ): Promise<PaymentDto> {
    const isPrivileged = ['OWNER', 'ADMIN', 'SUPPORT'].includes(req.user.role);

    if (!isPrivileged) {
      throw new ForbiddenException(
        'User does not have permission to refund payments',
      );
    }

    refoundPaymentDto.refundedBy = req.user.id;

    return this.paymentsService.refound(idParamDto, refoundPaymentDto);
  }
}
