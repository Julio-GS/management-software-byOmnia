import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DashboardCacheInvalidationHandler } from './dashboard-cache-invalidation.handler';
import { SaleCreatedEvent, SaleCancelledEvent } from '../../shared/events';

describe('DashboardCacheInvalidationHandler', () => {
  let handler: DashboardCacheInvalidationHandler;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardCacheInvalidationHandler,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    handler = module.get<DashboardCacheInvalidationHandler>(DashboardCacheInvalidationHandler);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('SaleCreatedEvent', () => {
    it('should clear dashboard cache when sale is created', async () => {
      const event = new SaleCreatedEvent(
        'sale-1',
        'S-001',
        200,
        [{ productId: 'prod-1', quantity: 2, price: 100, subtotal: 200 }],
        'CASH',
        new Date(),
        'user-1',
        'corr-123',
      );

      await handler.handle(event);

      expect(cacheManager.del).toHaveBeenCalledWith('dashboard:metrics');
    });
  });

  describe('SaleCancelledEvent', () => {
    it('should clear dashboard cache when sale is cancelled', async () => {
      const event = new SaleCancelledEvent(
        'sale-1',
        'Customer request',
        new Date(),
        'user-1',
        'corr-456',
      );

      await handler.handle(event);

      expect(cacheManager.del).toHaveBeenCalledWith('dashboard:metrics');
    });
  });
});
