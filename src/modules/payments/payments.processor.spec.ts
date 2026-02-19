import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsProcessor } from './payments.processor';
import { MachineService } from 'src/providers/machine/machine.service';
import { Job } from 'bullmq';
import { EfiWebhookDto } from './dto/efi-webhook.dto';
import { v4 as uuid } from 'uuid';

describe('PaymentsProcessor', () => {
  let processor: PaymentsProcessor;
  let dbMock: any;
  let machineServiceMock: jest.Mocked<MachineService>;

  // Mocks for DB responses
  const mockPaymentId = uuid();
  const mockAccountId = uuid();
  const mockMachineId = 'machine-123';
  const mockTxid = 'txid_xyz789';

  const mockUpdatedPayment = { id: mockPaymentId, accountId: mockAccountId };
  const mockAccount = { machineId: mockMachineId };

  beforeEach(async () => {
    // Setup clear, separate mocks for each fluent DB call chain
    const updateReturningMock = jest.fn();
    const updateWhereMock = jest
      .fn()
      .mockReturnValue({ returning: updateReturningMock });
    const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });

    const selectWhereMock = jest.fn();
    const selectFromMock = jest
      .fn()
      .mockReturnValue({ where: selectWhereMock });

    dbMock = {
      update: jest.fn().mockReturnValue({ set: updateSetMock }),
      select: jest.fn().mockReturnValue({ from: selectFromMock }),
      __mocks: {
        // Store mocks for easy access in tests
        updateReturningMock,
        selectWhereMock,
      },
    };

    const machineServiceProviderMock = {
      provide: MachineService,
      useValue: {
        updateAccountData: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsProcessor,
        { provide: 'DRIZZLE', useValue: dbMock },
        machineServiceProviderMock,
      ],
    }).compile();

    processor = module.get<PaymentsProcessor>(PaymentsProcessor);
    machineServiceMock = module.get<MachineService>(MachineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    const webhookPayload: EfiWebhookDto = {
      pix: [
        {
          endToEndId: 'E12345678',
          txid: mockTxid,
          valor: '10.00',
          horario: new Date().toISOString(),
        },
      ],
    };
    const job = { data: webhookPayload, id: 'job-1' } as Job<EfiWebhookDto>;

    it('should process a payment update and update machine status', async () => {
      // Arrange: configure the mock implementations for this specific test
      dbMock.__mocks.updateReturningMock.mockResolvedValue([
        mockUpdatedPayment,
      ]);
      dbMock.__mocks.selectWhereMock.mockResolvedValue([mockAccount]);

      // Act
      const result = await processor.process(job);

      // Assert
      // 1. Verify payment is updated in DB
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.update().set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
      expect(dbMock.update().set().where).toHaveBeenCalled();

      // 2. Verify account is queried for machineId
      expect(dbMock.select).toHaveBeenCalled();
      expect(dbMock.select().from).toHaveBeenCalled();
      expect(dbMock.select().from().where).toHaveBeenCalled();

      // 3. Verify machine service is called
      expect(machineServiceMock.updateAccountData).toHaveBeenCalledWith(
        { id: mockMachineId },
        {
          status_condutor: 'A',
          observacao_interna_3: expect.any(String),
        },
      );

      // 4. Verify result
      expect(result).toEqual({
        paymentId: mockPaymentId,
        status: 'completed',
        machineStatus: 'updated',
      });
    });

    it('should throw error if payment with txid not found', async () => {
      // Arrange
      dbMock.__mocks.updateReturningMock.mockResolvedValue([]); // Simulate payment not found

      // Act & Assert
      await expect(processor.process(job)).rejects.toThrow(
        `Payment with txid ${mockTxid} not found.`,
      );
      expect(machineServiceMock.updateAccountData).not.toHaveBeenCalled();
    });

    it('should skip machine update if account has no machineId', async () => {
      // Arrange
      dbMock.__mocks.updateReturningMock.mockResolvedValue([
        mockUpdatedPayment,
      ]);
      dbMock.__mocks.selectWhereMock.mockResolvedValue([{ machineId: null }]); // Simulate account with no machineId

      // Act
      const result = await processor.process(job);

      // Assert
      expect(machineServiceMock.updateAccountData).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ machineStatus: 'skipped' }),
      );
    });
  });
});
