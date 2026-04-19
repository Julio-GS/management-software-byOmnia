import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsRepository } from './repositories/products.repository';
import { EventBus } from '@nestjs/cqrs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { Product } from './entities/product.entity';

describe('ProductsService - Caching', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;
  let cacheManager: jest.Mocked<Cache>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      reset: jest.fn(),
      del: jest.fn(),
    };

    const mockRepository = {
      findAll: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockRepository },
        { provide: EventBus, useValue: mockEventBus },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository);
    cacheManager = module.get(CACHE_MANAGER);
    eventBus = module.get(EventBus);

    // Reset environment for each test
    delete process.env.ENABLE_PRODUCTS_CACHE;
  });

  describe('Cache HIT scenario', () => {
    it('should return cached data and NOT call repository when cache hit', async () => {
      // Enable cache
      process.env.ENABLE_PRODUCTS_CACHE = 'true';

      // Mock cached products
      const cachedProducts = [
        Product.fromPersistence({
          id: '1',
          name: 'Cached Product',
          sku: 'CACHED-001',
          barcode: '1234567890123',
          categoryId: 'cat-1',
          price: 100,
          stock: 50,
          minStock: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      cacheManager.get.mockResolvedValue(cachedProducts);

      const result = await service.findAll({});

      expect(cacheManager.get).toHaveBeenCalledWith('products:all:{}');
      expect(result).toEqual([cachedProducts[0].toJSON()]);
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('should use different cache keys for different filters', async () => {
      process.env.ENABLE_PRODUCTS_CACHE = 'true';

      const cachedProducts = [
        Product.fromPersistence({
          id: '1',
          name: 'Test Product',
          sku: 'TEST-001',
          barcode: '1234567890123',
          categoryId: 'cat-1',
          price: 100,
          stock: 50,
          minStock: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      cacheManager.get.mockResolvedValue(cachedProducts);

      const filters1 = { categoryId: 'cat-1' };
      const filters2 = { isActive: true };

      await service.findAll(filters1);
      await service.findAll(filters2);

      expect(cacheManager.get).toHaveBeenCalledWith(
        `products:all:${JSON.stringify(filters1)}`,
      );
      expect(cacheManager.get).toHaveBeenCalledWith(
        `products:all:${JSON.stringify(filters2)}`,
      );
    });
  });

  describe('Cache MISS scenario', () => {
    it('should call repository and store result in cache when cache miss', async () => {
      process.env.ENABLE_PRODUCTS_CACHE = 'true';

      // Mock cache miss
      cacheManager.get.mockResolvedValue(undefined);

      // Mock repository response
      const products = [
        Product.fromPersistence({
          id: '1',
          name: 'Product from DB',
          sku: 'DB-001',
          barcode: '1234567890123',
          categoryId: 'cat-1',
          price: 200,
          stock: 30,
          minStock: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll({});

      expect(cacheManager.get).toHaveBeenCalledWith('products:all:{}');
      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(cacheManager.set).toHaveBeenCalledWith(
        'products:all:{}',
        products,
        300000,
      );
      expect(result).toEqual([products[0].toJSON()]);
    });
  });

  describe('Cache disabled (feature flag OFF)', () => {
    it('should call repository directly when ENABLE_PRODUCTS_CACHE is false', async () => {
      process.env.ENABLE_PRODUCTS_CACHE = 'false';

      const products = [
        Product.fromPersistence({
          id: '1',
          name: 'Product',
          sku: 'PROD-001',
          barcode: '1234567890123',
          categoryId: 'cat-1',
          price: 150,
          stock: 20,
          minStock: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual([products[0].toJSON()]);
    });

    it('should call repository directly when ENABLE_PRODUCTS_CACHE is not set', async () => {
      // process.env.ENABLE_PRODUCTS_CACHE is undefined

      const products = [
        Product.fromPersistence({
          id: '1',
          name: 'Product',
          sku: 'PROD-001',
          barcode: '1234567890123',
          categoryId: 'cat-1',
          price: 150,
          stock: 20,
          minStock: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual([products[0].toJSON()]);
    });
  });
});
