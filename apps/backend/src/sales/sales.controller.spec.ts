import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetSalesQuery } from './queries/get-sales.query';
import { GetSaleByNumberQuery } from './queries/get-sale-by-number.query';
import { CreateSaleCommand } from './commands/create-sale.command';
import { CancelSaleCommand } from './commands/cancel-sale.command';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesController (CQRS)', () => {
  let controller: SalesController;
  let queryBus: QueryBus;
  let commandBus: CommandBus;
  let salesService: SalesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SalesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
    queryBus = module.get<QueryBus>(QueryBus);
    commandBus = module.get<CommandBus>(CommandBus);
    salesService = module.get<SalesService>(SalesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (GET /sales)', () => {
    it('should dispatch GetSalesQuery with filters', async () => {
      const status = 'completed';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = [{ id: '1', saleNumber: 'SALE-001', status: 'completed' }];
      jest.spyOn(queryBus, 'execute').mockResolvedValue(result);

      const response = await controller.findAll(status, startDate, endDate);

      expect(response).toBe(result);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            status,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        }),
      );
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should dispatch GetSalesQuery without filters', async () => {
      const result = [{ id: '1', saleNumber: 'SALE-001' }];
      jest.spyOn(queryBus, 'execute').mockResolvedValue(result);

      const response = await controller.findAll();

      expect(response).toBe(result);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {},
        }),
      );
    });
  });

  describe('findBySaleNumber (GET /sales/number/:saleNumber)', () => {
    it('should dispatch GetSaleByNumberQuery', async () => {
      const saleNumber = 'SALE-001';
      const result = { id: '1', saleNumber };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(result);

      const response = await controller.findBySaleNumber(saleNumber);

      expect(response).toBe(result);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          saleNumber,
        }),
      );
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('create (POST /sales)', () => {
    it('should dispatch CreateSaleCommand with all fields', async () => {
      const dto: CreateSaleDto = {
        items: [
          { productId: 'prod-1', quantity: 2, unitPrice: 100, discount: 10 },
          { productId: 'prod-2', quantity: 1, unitPrice: 50 },
        ],
        paymentMethod: 'cash',
        discountAmount: 20,
        customerId: 'cust-1',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        notes: 'Test sale',
        cashierId: 'cashier-1',
        deviceId: 'device-1',
      };
      const result = { id: '1', saleNumber: 'SALE-001', ...dto };
      jest.spyOn(commandBus, 'execute').mockResolvedValue(result);

      const response = await controller.create(dto);

      expect(response).toBe(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          items: dto.items,
          paymentMethod: dto.paymentMethod,
          discountAmount: dto.discountAmount,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          notes: dto.notes,
          cashierId: dto.cashierId,
          deviceId: dto.deviceId,
        }),
      );
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should dispatch CreateSaleCommand with required fields only', async () => {
      const dto: CreateSaleDto = {
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
        paymentMethod: 'cash',
      };
      const result = { id: '1', saleNumber: 'SALE-001', ...dto };
      jest.spyOn(commandBus, 'execute').mockResolvedValue(result);

      const response = await controller.create(dto);

      expect(response).toBe(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          items: dto.items,
          paymentMethod: dto.paymentMethod,
        }),
      );
    });
  });

  describe('cancel (PATCH /sales/:id/cancel)', () => {
    it('should dispatch CancelSaleCommand with userId', async () => {
      const id = 'sale-123';
      const userId = 'user-456';
      const user = { id: userId };
      const cancelDto = { reason: 'Customer request' };
      const result = { id, status: 'cancelled' };
      jest.spyOn(commandBus, 'execute').mockResolvedValue(result);

      const response = await controller.cancel(id, cancelDto, user);

      expect(response).toBe(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: id,
          userId,
          reason: cancelDto.reason,
        }),
      );
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should dispatch CancelSaleCommand without reason', async () => {
      const id = 'sale-123';
      const userId = 'user-456';
      const user = { id: userId };
      const cancelDto = {};
      const result = { id, status: 'cancelled' };
      jest.spyOn(commandBus, 'execute').mockResolvedValue(result);

      const response = await controller.cancel(id, cancelDto, user);

      expect(response).toBe(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: id,
          userId,
        }),
      );
    });
  });

  describe('findOne (GET /sales/:id)', () => {
    it('should call salesService.findOne (NO CQRS yet)', async () => {
      const id = 'sale-123';
      const result = { id, saleNumber: 'SALE-001' };
      jest.spyOn(salesService, 'findOne').mockResolvedValue(result as any);

      const response = await controller.findOne(id);

      expect(response).toBe(result);
      expect(salesService.findOne).toHaveBeenCalledWith(id);
      expect(queryBus.execute).not.toHaveBeenCalled();
    });
  });
});
