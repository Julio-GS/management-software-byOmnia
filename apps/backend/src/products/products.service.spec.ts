import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { ProductsEsService } from './products-es.service';
import { ProductosRepository } from './repositories/productos.repository';
import { createMockProducto } from '../shared/test-utils';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../shared/events';

describe('ProductsEsService', () => {
  let service: ProductsEsService;
  let repository: jest.Mocked<ProductosRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const mockProduct = createMockProducto({
    id: '123',
    codigo: 'TEST-001',
    detalle: 'Test Product',
    codigo_barras: '1234567890',
    precio_venta: 100,
    costo: 60,
    stock_minimo: 10,
    rubro_id: 'cat-123',
    activo: true,
    iva: 21,
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findBySku: jest.fn(),
      findByBarcode: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      save: jest.fn(),
      findLowStock: jest.fn(),
      getTotalInventoryValue: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
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
        {
          provide: ProductosRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductsEsService>(ProductsEsService);
    repository = module.get(ProductosRepository);
    eventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product and emit ProductCreatedEvent', async () => {
      const dto = {
        detalle: 'Test Product',
        codigo: 'TEST-001',
        precio_venta: 100,
        costo: 60,
      };

      repository.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(result).toEqual(mockProduct);
      // Event uses English field names (mapped in service)
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProduct.id,
          name: mockProduct.detalle,
          sku: mockProduct.codigo,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductCreatedEvent),
      );
    });

    it('should auto-set requiere_precio_manual when es_codigo_especial is true', async () => {
      const dto = {
        detalle: 'F1',
        codigo: 'F',
        precio_venta: 0,
        costo: 0,
        es_codigo_especial: true,
      };

      const specialProduct = createMockProducto({
        ...dto,
        requiere_precio_manual: true,
        maneja_stock: false,
      });

      repository.create.mockResolvedValue(specialProduct);

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requiere_precio_manual: true,
          maneja_stock: false,
        }),
      );
    });

    it('should propagate ConflictException from repository', async () => {
      const dto = {
        detalle: 'Test Product',
        codigo: 'TEST-001',
        precio_venta: 100,
        costo: 60,
      };

      repository.create.mockRejectedValue(
        new ConflictException('Product with SKU TEST-001 already exists'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all products with filters', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(repository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual([mockProduct]);
    });

    it('should filter products by category', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ rubro_id: 'cat-123', page: 1, limit: 20 });

      expect(repository.findAll).toHaveBeenCalledWith({ rubro_id: 'cat-123', page: 1, limit: 20 });
      expect(result).toEqual([mockProduct]);
    });

    it('should filter products by active status', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ activo: true, page: 1, limit: 20 });

      expect(repository.findAll).toHaveBeenCalledWith({ activo: true, page: 1, limit: 20 });
      expect(result).toEqual([mockProduct]);
    });

    it('should search products by text', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ search: 'test', page: 1, limit: 20 });

      expect(repository.findAll).toHaveBeenCalledWith({ search: 'test', page: 1, limit: 20 });
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      repository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne('123');

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU (codigo)', async () => {
      // findBySku calls findByCodigo internally
      repository.findByCodigo.mockResolvedValue(mockProduct);

      const result = await service.findBySku('TEST-001');

      expect(repository.findByCodigo).toHaveBeenCalledWith('TEST-001');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findByCodigo.mockResolvedValue(null);

      await expect(service.findBySku('NONEXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByBarcode', () => {
    it('should return a product by barcode', async () => {
      repository.findByBarcode.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('1234567890');

      expect(repository.findByBarcode).toHaveBeenCalledWith('1234567890');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findByBarcode.mockResolvedValue(null);

      await expect(service.findByBarcode('0000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a product and emit ProductUpdatedEvent', async () => {
      const dto = { detalle: 'Updated Product' };
      const updatedProduct = createMockProducto({
        ...mockProduct,
        detalle: 'Updated Product',
      });

      repository.update.mockResolvedValue(updatedProduct);

      const result = await service.update('123', dto);

      expect(repository.update).toHaveBeenCalledWith('123', dto);
      expect(result).toEqual(updatedProduct);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductUpdatedEvent),
      );
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.update.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.update('999', { detalle: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should propagate ConflictException from repository', async () => {
      repository.update.mockRejectedValue(
        new ConflictException('Product with SKU TEST-001 already exists'),
      );

      await expect(
        service.update('123', { codigo: 'TEST-001' }),
      ).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a product and emit ProductDeletedEvent', async () => {
      const deletedProduct = createMockProducto({
        ...mockProduct,
        activo: false,
      });

      repository.softDelete.mockResolvedValue(deletedProduct);

      const result = await service.remove('123');

      expect(repository.softDelete).toHaveBeenCalledWith('123');
      expect(result).toEqual(deletedProduct);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductDeletedEvent),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ id: '123' }),
      );
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.softDelete.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const lowStockProduct = createMockProducto({
        ...mockProduct,
        stock_minimo: 10,
      });

      repository.findLowStock.mockResolvedValue([lowStockProduct]);

      const result = await service.getLowStockProducts();

      expect(repository.findLowStock).toHaveBeenCalled();
      expect(result).toEqual([lowStockProduct]);
    });

    it('should return empty array when no low stock products', async () => {
      repository.findLowStock.mockResolvedValue([]);

      const result = await service.getLowStockProducts();

      expect(repository.findLowStock).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getTotalInventoryValue', () => {
    it('should return total inventory value', async () => {
      repository.getTotalInventoryValue.mockResolvedValue(5000);

      const result = await service.getTotalInventoryValue();

      expect(repository.getTotalInventoryValue).toHaveBeenCalled();
      expect(result).toEqual({ totalValue: 5000 });
    });
  });

  describe('bulkUpdatePrices', () => {
    it('should update prices for multiple products', async () => {
      const updates = [
        { producto_id: '123', nuevo_costo: 70, nuevo_precio: 110 },
        { producto_id: '456', nuevo_costo: 50, nuevo_precio: 80 },
      ];

      repository.update.mockResolvedValue(mockProduct);

      const result = await service.bulkUpdatePrices(updates);

      expect(repository.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updated: 2 });
    });
  });
});
