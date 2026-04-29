import { Test, TestingModule } from '@nestjs/testing';
import { ProductsEsService } from './products-es.service';
import { ProductosRepository } from './repositories/productos.repository';
import { EventBus } from '@nestjs/cqrs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { createMockProducto } from '../shared/test-utils/mock-factories';

describe('ProductsEsService - Caching', () => {
  let service: ProductsEsService;
  let repository: jest.Mocked<ProductosRepository>;
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
        ProductsEsService,
        { provide: ProductosRepository, useValue: mockRepository },
        { provide: EventBus, useValue: mockEventBus },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProductsEsService>(ProductsEsService);
    repository = module.get(ProductosRepository);
    cacheManager = module.get(CACHE_MANAGER);
    eventBus = module.get(EventBus);
  });

  // TODO: Caching not yet implemented in ProductsEsService
  // These tests verify basic repository delegation without caching
  describe('Repository delegation (no caching yet)', () => {
    it('should call repository findAll with empty filters', async () => {
      const products = [
        createMockProducto({ id: '1', detalle: 'Product 1', codigo: 'PROD-001' }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(products);
    });

    it('should call repository findAll with rubro_id filter', async () => {
      const filters = { rubro_id: 'cat-1' };
      const products = [
        createMockProducto({ id: '1', detalle: 'Product in category', codigo: 'CAT-001', rubro_id: 'cat-1' }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll(filters);

      expect(repository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(products);
    });

    it('should call repository findAll with activo filter', async () => {
      const filters = { activo: true };
      const products = [
        createMockProducto({ id: '1', detalle: 'Active product', codigo: 'ACT-001', activo: true }),
      ];

      repository.findAll.mockResolvedValue(products);

      const result = await service.findAll(filters);

      expect(repository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(products);
    });

    it('should return empty array when no products match filters', async () => {
      const filters = { rubro_id: 'nonexistent' };

      repository.findAll.mockResolvedValue([]);

      const result = await service.findAll(filters);

      expect(repository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual([]);
    });
  });
});
