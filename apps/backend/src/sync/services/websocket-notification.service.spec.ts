import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketNotificationService } from './websocket-notification.service';
import { SyncGateway } from '../sync.gateway';

describe('WebSocketNotificationService', () => {
  let service: WebSocketNotificationService;
  let mockSyncGateway: jest.Mocked<SyncGateway>;

  beforeEach(async () => {
    // Create mock SyncGateway with all required methods
    mockSyncGateway = {
      emitProductCreated: jest.fn(),
      emitProductUpdated: jest.fn(),
      emitInventoryMovement: jest.fn(),
      emitPricingRecalculated: jest.fn(),
      emitSaleCreated: jest.fn(),
      emitSaleCancelled: jest.fn(),
    } as unknown as jest.Mocked<SyncGateway>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketNotificationService,
        {
          provide: SyncGateway,
          useValue: mockSyncGateway,
        },
      ],
    }).compile();

    service = module.get<WebSocketNotificationService>(WebSocketNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyProductCreated', () => {
    it('should delegate to syncGateway.emitProductCreated', async () => {
      const product = { id: '1', name: 'Test Product', sku: 'TEST-001' };

      await service.notifyProductCreated(product);

      expect(mockSyncGateway.emitProductCreated).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitProductCreated).toHaveBeenCalledWith(product);
    });
  });

  describe('notifyProductUpdated', () => {
    it('should delegate to syncGateway.emitProductUpdated', async () => {
      const product = { id: '1', name: 'Updated Product', sku: 'TEST-001' };

      await service.notifyProductUpdated(product);

      expect(mockSyncGateway.emitProductUpdated).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitProductUpdated).toHaveBeenCalledWith(product);
    });
  });

  describe('notifyInventoryMovement', () => {
    it('should delegate to syncGateway.emitInventoryMovement', async () => {
      const movement = { id: '1', productId: 'p1', quantity: 10, type: 'ENTRY' };

      await service.notifyInventoryMovement(movement);

      expect(mockSyncGateway.emitInventoryMovement).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitInventoryMovement).toHaveBeenCalledWith(movement);
    });
  });

  describe('notifyPricingRecalculated', () => {
    it('should delegate to syncGateway.emitPricingRecalculated', async () => {
      const data = { type: 'product' as const, count: 5, id: 'p1' };

      await service.notifyPricingRecalculated(data);

      expect(mockSyncGateway.emitPricingRecalculated).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitPricingRecalculated).toHaveBeenCalledWith(data);
    });
  });

  describe('notifySaleCreated', () => {
    it('should delegate to syncGateway.emitSaleCreated', async () => {
      const sale = { id: '1', saleNumber: 'S-001', totalAmount: 100 };

      await service.notifySaleCreated(sale);

      expect(mockSyncGateway.emitSaleCreated).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitSaleCreated).toHaveBeenCalledWith(sale);
    });
  });

  describe('notifySaleCancelled', () => {
    it('should delegate to syncGateway.emitSaleCancelled', async () => {
      const sale = { id: '1', saleNumber: 'S-001', reason: 'Customer request' };

      await service.notifySaleCancelled(sale);

      expect(mockSyncGateway.emitSaleCancelled).toHaveBeenCalledTimes(1);
      expect(mockSyncGateway.emitSaleCancelled).toHaveBeenCalledWith(sale);
    });
  });
});
