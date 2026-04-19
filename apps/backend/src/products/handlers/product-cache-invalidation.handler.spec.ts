import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProductCacheInvalidationHandler } from './product-cache-invalidation.handler';
import { ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent } from '../../shared/events';

describe('ProductCacheInvalidationHandler', () => {
  let handler: ProductCacheInvalidationHandler;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      store: {
        keys: jest.fn().mockResolvedValue([
          'products:all:{}',
          'products:all:{"categoryId":"cat-1"}',
          'dashboard:metrics',
          'other-key',
        ]),
        del: jest.fn(),
      },
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCacheInvalidationHandler,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    handler = module.get<ProductCacheInvalidationHandler>(ProductCacheInvalidationHandler);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('ProductCreatedEvent', () => {
    it('should clear product cache keys when product is created', async () => {
      const event = new ProductCreatedEvent(
        'product-1',
        'New Product',
        'NEW-001',
        '1234567890123',
        'cat-1',
        100,
      );

      await handler.handle(event);

      // Should delete both product cache keys
      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{}');
      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{"categoryId":"cat-1"}');
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('ProductUpdatedEvent', () => {
    it('should clear product cache keys when product is updated', async () => {
      const event = new ProductUpdatedEvent('product-1', {
        name: 'Updated Product',
        sku: 'UPD-001',
        basePrice: 150,
      });

      await handler.handle(event);

      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{}');
      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{"categoryId":"cat-1"}');
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('ProductDeletedEvent', () => {
    it('should clear product cache keys when product is deleted', async () => {
      const event = new ProductDeletedEvent('product-1', 'DEL-001');

      await handler.handle(event);

      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{}');
      expect(cacheManager.del).toHaveBeenCalledWith('products:all:{"categoryId":"cat-1"}');
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });
  });
});
