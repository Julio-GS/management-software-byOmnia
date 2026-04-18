import { Test, TestingModule } from '@nestjs/testing';
import { CreateSaleHandler } from './create-sale.handler';
import { SalesService } from '../../sales.service';
import { CreateSaleCommand } from '../create-sale.command';

describe('CreateSaleHandler', () => {
  let handler: CreateSaleHandler;
  let salesService: jest.Mocked<SalesService>;

  beforeEach(async () => {
    const mockSalesService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSaleHandler,
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    }).compile();

    handler = module.get<CreateSaleHandler>(CreateSaleHandler);
    salesService = module.get(SalesService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call salesService.create with correct DTO when executing command', async () => {
    // Arrange
    const items = [
      { productId: 'prod-1', quantity: 2, unitPrice: 100, discount: 0 },
      { productId: 'prod-2', quantity: 1, unitPrice: 50, discount: 5 },
    ];

    const command = new CreateSaleCommand(
      items,
      'cash',
      10,
      'cust-123',
      'John Doe',
      'john@example.com',
      'Test sale',
      'cashier-1',
      'device-1',
    );

    const expectedDto = {
      items,
      paymentMethod: 'cash',
      discountAmount: 10,
      customerId: 'cust-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      notes: 'Test sale',
      cashierId: 'cashier-1',
      deviceId: 'device-1',
    };

    const mockSale = {
      id: 'sale-123',
      saleNumber: 'SALE-20260416-0001',
      totalAmount: 245,
      status: 'COMPLETED',
    };

    salesService.create.mockResolvedValue(mockSale);

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(salesService.create).toHaveBeenCalledWith(expectedDto);
    expect(salesService.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSale);
  });

  it('should handle optional fields correctly', async () => {
    // Arrange — minimal command with only required fields
    const items = [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }];
    const command = new CreateSaleCommand(items, 'card');

    const expectedDto = {
      items,
      paymentMethod: 'card',
      discountAmount: undefined,
      customerId: undefined,
      customerName: undefined,
      customerEmail: undefined,
      notes: undefined,
      cashierId: undefined,
      deviceId: undefined,
    };

    const mockSale = { id: 'sale-456', saleNumber: 'SALE-20260416-0002', totalAmount: 100, status: 'COMPLETED' };
    salesService.create.mockResolvedValue(mockSale);

    // Act
    await handler.execute(command);

    // Assert
    expect(salesService.create).toHaveBeenCalledWith(expectedDto);
  });
});
