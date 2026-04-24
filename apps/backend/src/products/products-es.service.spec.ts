import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { ProductsEsService } from './products-es.service';
import { ProductosRepository } from './repositories/productos.repository';
import { Producto } from './entities/producto.entity';

/**
 * ProductsEsService - Spanish Products Service Test
 * 
 * Tests for Productos CRUD with Spanish field names (schema productos)
 */
describe('ProductsEsService', () => {
  let service: ProductsEsService;
  let repository: jest.Mocked<ProductosRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const mockProducto: Producto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    codigo: 'COCA-2.25L',
    codigo_alternativo: null,
    codigo_barras: '7790895001567',
    detalle: 'Coca Cola 2.25L',
    proveedor_id: null,
    rubro_id: null,
    unidad_medida_id: null,
    contenido: 2.25,
    es_codigo_especial: false,
    requiere_precio_manual: false,
    maneja_lotes: false,
    costo: 850,
    iva: 21,
    precio_venta: 1200,
    stock_minimo: 20,
    maneja_stock: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
    getPrecioConIva: function() { return this.precio_venta * (1 + this.iva / 100); },
    isManualPrice: function() { return this.requiere_precio_manual; },
    isLoteTracked: function() { return this.maneja_lotes; },
    isSpecialCode: function() { return this.es_codigo_especial; },
    activate: function() { this.activo = true; },
    deactivate: function() { this.activo = false; },
    updatePrice: function(c: number, p: number) { this.costo = c; this.precio_venta = p; },
    toJSON: function() { return this; },
  } as unknown as Producto;

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findByBarcode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findLowStock: jest.fn(),
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
        {
          provide: ProductosRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
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

  describe('create', () => {
    it('should create a product with auto-set flags for special codes', async () => {
      const createDto = {
        codigo: 'F-VERDE',
        detalle: 'Verdura fresca',
        es_codigo_especial: true,
      };

      const createdProducto = Producto.create(createDto);
      repository.create.mockResolvedValue(createdProducto);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it('should create a regular product', async () => {
      const createDto = {
        codigo: 'TEST-001',
        detalle: 'Test Product',
        costo: 100,
        precio_venta: 200,
      };

      const createdProducto = Producto.create(createDto);
      repository.create.mockResolvedValue(createdProducto);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const mockData = [mockProducto];
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll({});

      expect(result).toEqual(mockData);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by activo', async () => {
      const mockData = [mockProducto];
      repository.findAll.mockResolvedValue(mockData);

      await service.findAll({ activo: true });

      expect(repository.findAll).toHaveBeenCalledWith({ activo: true });
    });
  });

  describe('findById', () => {
    it('should return product by id', async () => {
      repository.findById.mockResolvedValue(mockProducto);

      const result = await service.findById(mockProducto.id);

      expect(result).toEqual(mockProducto);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCodigo', () => {
    it('should return product by codigo', async () => {
      repository.findByCodigo.mockResolvedValue(mockProducto);

      const result = await service.findByCodigo('COCA-2.25L');

      expect(result).toEqual(mockProducto);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByCodigo.mockResolvedValue(null);

      await expect(service.findByCodigo('UNKNOWN')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByBarcode', () => {
    it('should return product by codigo_barras', async () => {
      repository.findByBarcode.mockResolvedValue(mockProducto);

      const result = await service.findByBarcode('7790895001567');

      expect(result).toEqual(mockProducto);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateDto = { precio_venta: 1500 };
      const updatedProducto = { ...mockProducto, precio_venta: 1500 };
      repository.update.mockResolvedValue(updatedProducto as any);

      const result = await service.update(mockProducto.id, updateDto);

      expect(result).toBeDefined();
    });
  });

  describe('softDelete', () => {
    it('should soft delete a product', async () => {
      const deletedProducto = { ...mockProducto, activo: false };
      repository.softDelete.mockResolvedValue(deletedProducto as any);

      const result = await service.remove(mockProducto.id);

      expect(repository.softDelete).toHaveBeenCalledWith(mockProducto.id);
    });
  });

  describe('getLowStock', () => {
    it('should return products with low stock', async () => {
      const mockData = [mockProducto];
      repository.findLowStock.mockResolvedValue(mockData);

      const result = await service.getLowStock();

      expect(result).toEqual(mockData);
    });
  });
});