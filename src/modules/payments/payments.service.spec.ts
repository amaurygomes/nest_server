import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { DRIZZLE } from 'src/providers/database/drizzle/drizzle.module';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from 'src/providers/payment-gateways/payment-gateway.interface';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let dbMock: any;
  let paymentGatewayMock: jest.Mocked<IPaymentGateway>;

  const mockAccount = {
    id: uuid(),
    name: 'Test User',
    cpf: '12345678900',
    email: 'test@example.com',
  };

  const mockPayment = {
    id: uuid(),
    accountId: mockAccount.id,
    amount: '150.50',
    description: 'Test Payment',
    transactionId: 'txid_123',
    status: 'PENDING',
    paymentMethod: 'PIX',
  };

  beforeEach(async () => {
    // Deep mock for the Drizzle fluent interface
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([mockAccount]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockPayment]),
    };

    const paymentGatewayProviderMock = {
      provide: PAYMENT_GATEWAY_TOKEN,
      useValue: {
        createCharge: jest.fn().mockResolvedValue({
          transactionId: 'txid_123',
          status: 'ATIVA',
          qrCode: 'pix_qrcode_string',
          qrCodeImageBase64: 'base64_image_string',
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: 'DRIZZLE', useValue: dbMock },
        paymentGatewayProviderMock,
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentGatewayMock = module.get(PAYMENT_GATEWAY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPaymentDto = {
      accountId: mockAccount.id,
      amount: 15050, // in cents
      description: 'Test Payment',
    };

    it('should create a payment successfully', async () => {
      const result = await service.create(createPaymentDto);

      // 1. Check if account was queried
      expect(dbMock.select).toHaveBeenCalled();
      expect(dbMock.from).toHaveBeenCalledWith(expect.any(Object)); // accounts schema
      expect(dbMock.where).toHaveBeenCalledWith(expect.any(Object)); // eq(accounts.id, ...)

      // 2. Check if payment gateway was called
      expect(paymentGatewayMock.createCharge).toHaveBeenCalledWith({
        value: createPaymentDto.amount,
        description: createPaymentDto.description,
        customer: {
          name: mockAccount.name,
          document: mockAccount.cpf,
          email: mockAccount.email,
        },
      });

      // 3. Check if payment was inserted into DB
      expect(dbMock.insert).toHaveBeenCalledWith(expect.any(Object)); // payments schema
      expect(dbMock.values).toHaveBeenCalledWith({
        accountId: createPaymentDto.accountId,
        amount: '150.50',
        description: createPaymentDto.description,
        transactionId: 'txid_123',
        status: 'PENDING',
        paymentMethod: 'PIX',
        pixCopyPaste: 'pix_qrcode_string',
        pixImageBase64: 'base64_image_string',
      });
      expect(dbMock.returning).toHaveBeenCalled();

      // 4. Check the final result
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      dbMock.where.mockResolvedValue([]); // Simulate account not found

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if gateway fails', async () => {
      paymentGatewayMock.createCharge.mockRejectedValue(
        new Error('Gateway Error'),
      );

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if db insert fails', async () => {
      dbMock.returning.mockResolvedValue([]); // Simulate db insert failing

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
