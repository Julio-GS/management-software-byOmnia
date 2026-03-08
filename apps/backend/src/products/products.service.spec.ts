import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './repositories/products.repository';
import { Product } from './entities/product.entity';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../shared/events';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const mockProduct = Product.fromPersistence({
    id: '123',
    name: 'Test Product',
    description: 'Test Description',
    sku: 'TEST-001',
    barcode: '1234567890',
    price: 100,
    cost: 60,
    markup: 30,
    stock: 50,
    minStock: 10,
    maxStock: 200,
    categoryId: 'cat-123',
    isActive: true,
    taxRate: 21,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      findByBarcode: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      save: jest.fn(),
      findLowStock: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository);
    eventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product and emit ProductCreatedEvent', async () => {
      const dto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 60,
      };

      repository.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProduct.toJSON());
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProduct.id,
          name: mockProduct.name,
          sku: mockProduct.sku,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductCreatedEvent),
      );
    });

    it('should propagate ConflictException from repository', async () => {
      const dto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 60,
      };

      repository.create.mockRejectedValue(
        new ConflictException('Product with SKU TEST-001 already exists'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockProduct.toJSON()]);
    });

    it('should filter products by category', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ categoryId: 'cat-123' });

      expect(repository.findAll).toHaveBeenCalledWith({ categoryId: 'cat-123' });
      expect(result).toEqual([mockProduct.toJSON()]);
    });

    it('should filter products by active status', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ isActive: true });

      expect(repository.findAll).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual([mockProduct.toJSON()]);
    });

    it('should search products by text', async () => {
      repository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ search: 'test' });

      expect(repository.findAll).toHaveBeenCalledWith({ search: 'test' });
      expect(result).toEqual([mockProduct.toJSON()]);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      repository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne('123');

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockProduct.toJSON());
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      repository.findBySku.mockResolvedValue(mockProduct);

      const result = await service.findBySku('TEST-001');

      expect(repository.findBySku).toHaveBeenCalledWith('TEST-001');
      expect(result).toEqual(mockProduct.toJSON());
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findBySku.mockResolvedValue(null);

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
      expect(result).toEqual(mockProduct.toJSON());
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
      const dto = { name: 'Updated Product' };
      const updatedProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        name: 'Updated Product',
      });

      repository.update.mockResolvedValue(updatedProduct);

      const result = await service.update('123', dto);

      expect(repository.update).toHaveBeenCalledWith('123', dto);
      expect(result).toEqual(updatedProduct.toJSON());
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductUpdatedEvent),
      );
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.update.mockRejectedValue(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(service.update('999', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should propagate ConflictException from repository', async () => {
      repository.update.mockRejectedValue(
        new ConflictException('Product with SKU TEST-001 already exists'),
      );

      await expect(
        service.update('123', { sku: 'TEST-001' }),
      ).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a product and emit ProductDeletedEvent', async () => {
      const deletedProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        isActive: false,
        deletedAt: new Date(),
      });

      repository.softDelete.mockResolvedValue(deletedProduct);

      const result = await service.remove('123');

      expect(repository.softDelete).toHaveBeenCalledWith('123');
      expect(result).toEqual(deletedProduct.toJSON());
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

  describe('updateStock', () => {
    it('should add stock using domain entity logic', async () => {
      repository.findById.mockResolvedValue(mockProduct);
      
      const updatedProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        stock: 60, // 50 + 10
      });
      repository.save.mockResolvedValue(updatedProduct);

      const result = await service.updateStock('123', 10);

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(repository.save).toHaveBeenCalledWith(expect.any(Product));
      expect(result).toEqual(updatedProduct.toJSON());
      expect(result.stock).toBe(60);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ProductUpdatedEvent),
      );
    });

    it('should remove stock using domain entity logic', async () => {
      repository.findById.mockResolvedValue(mockProduct);
      
      const updatedProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        stock: 45, // 50 - 5
      });
      repository.save.mockResolvedValue(updatedProduct);

      const result = await service.updateStock('123', -5);

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(repository.save).toHaveBeenCalledWith(expect.any(Product));
      expect(result).toEqual(updatedProduct.toJSON());
      expect(result.stock).toBe(45);
    });

    it('should throw error when removing more stock than available', async () => {
      repository.findById.mockResolvedValue(mockProduct);

      // Domain entity will throw error
      await expect(service.updateStock('123', -100)).rejects.toThrow(
        'Insufficient stock',
      );

      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should do nothing when quantity is 0', async () => {
      const productCopy = Product.fromPersistence(mockProduct.toJSON());
      repository.findById.mockResolvedValue(productCopy);
      
      // When saved, return a product with the same stock
      const savedProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        stock: 50, // Unchanged
      });
      repository.save.mockResolvedValue(savedProduct);

      const result = await service.updateStock('123', 0);

      expect(repository.findById).toHaveBeenCalledWith('123');
      expect(repository.save).toHaveBeenCalled();
      expect(result.stock).toBe(50); // Unchanged
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateStock('999', 10)).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const lowStockProduct = Product.fromPersistence({
        ...mockProduct.toJSON(),
        stock: 5, // Below minStock of 10
      });

      repository.findLowStock.mockResolvedValue([lowStockProduct]);

      const result = await service.getLowStockProducts();

      expect(repository.findLowStock).toHaveBeenCalled();
      expect(result).toEqual([lowStockProduct.toJSON()]);
      expect(result[0].stock).toBeLessThanOrEqual(result[0].minStock);
    });

    it('should return empty array when no low stock products', async () => {
      repository.findLowStock.mockResolvedValue([]);

      const result = await service.getLowStockProducts();

      expect(repository.findLowStock).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
