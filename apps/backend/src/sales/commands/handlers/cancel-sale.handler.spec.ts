import { Test, TestingModule } from '@nestjs/testing';
import { CancelSaleHandler } from './cancel-sale.handler';
import { SalesService } from '../../sales.service';
import { CancelSaleCommand } from '../cancel-sale.command';

describe('CancelSaleHandler', () => {
  let handler: CancelSaleHandler;
  let salesService: jest.Mocked<SalesService>;

  beforeEach(async () => {
    const mockSalesService = {
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelSaleHandler,
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    }).compile();

    handler = module.get<CancelSaleHandler>(CancelSaleHandler);
    salesService = module.get(SalesService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call salesService.cancel with saleId and userId when executing command', async () => {
    // Arrange
    const command = new CancelSaleCommand('sale-123', 'user-456', 'Customer requested cancellation');

    const mockCancelledSale = {
      id: 'sale-123',
      saleNumber: 'SALE-20260416-0001',
      status: 'CANCELLED',
    };

    salesService.cancel.mockResolvedValue(mockCancelledSale);

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(salesService.cancel).toHaveBeenCalledWith('sale-123', 'user-456');
    expect(salesService.cancel).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCancelledSale);
  });

  it('should handle cancellation without reason', async () => {
    // Arrange — no reason provided
    const command = new CancelSaleCommand('sale-789', 'user-111');

    const mockCancelledSale = { id: 'sale-789', saleNumber: 'SALE-20260416-0002', status: 'CANCELLED' };
    salesService.cancel.mockResolvedValue(mockCancelledSale);

    // Act
    await handler.execute(command);

    // Assert
    expect(salesService.cancel).toHaveBeenCalledWith('sale-789', 'user-111');
  });
});
