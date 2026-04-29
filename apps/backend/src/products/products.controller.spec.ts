import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsEsService } from './products-es.service';
import { PricingService } from '../pricing/pricing.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetProductsQuery } from './queries/get-products.query';
import { GetLowStockQuery } from './queries/get-low-stock.query';
import { CreateProductCommand } from './commands/create-product.command';
import { UpdateStockCommand } from './commands/update-stock.command';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsController (CQRS)', () => {
  let controller: ProductsController;
  let queryBus: QueryBus;
  let commandBus: CommandBus;
  let productsService: ProductsEsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ProductsEsService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            updateStock: jest.fn(),
            findBySku: jest.fn(),
            findByBarcode: jest.fn(),
            getTotalInventoryValue: jest.fn(),
          },
        },
        {
          provide: PricingService,
          useValue: {
            recalculatePriceForProduct: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    queryBus = module.get<QueryBus>(QueryBus);
    commandBus = module.get<CommandBus>(CommandBus);
    productsService = module.get<ProductsEsService>(ProductsEsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (GET /products)', () => {
    it('should dispatch GetProductsQuery with filters', async () => {
      const filters = { categoryId: '1', isActive: true, search: 'test' };
      const result = [{ id: '1', name: 'Product 1', price: 100 }];
      jest.spyOn(queryBus, 'execute').mockResolvedValue(result);

      const response = await controller.findAll(filters.categoryId, filters.isActive, filters.search);

      expect(response).toBe(result);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            categoryId: filters.categoryId,
            isActive: filters.isActive,
            search: filters.search,
          },
        }),
      );
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should dispatch GetProductsQuery without filters', async () => {
      const result = [{ id: '1', name: 'Product 1' }];
      jest.spyOn(queryBus, 'execute').mockResolvedValue(result);

      const response = await controller.findAll();

      expect(response).toBe(result);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            categoryId: undefined,
            isActive: undefined,
            search: undefined,
          },
        }),
      );
    });
  });

  describe('create (POST /products)', () => {
    it('should call ProductsEsService.create with all fields (Spanish DTO)', async () => {
      const dto: CreateProductDto = {
        codigo: 'SKU-001',
        codigo_barras: '123456789',
        detalle: 'Producto de prueba',
        costo: 50,
        precio_venta: 100,
        rubro_id: 'cat-1',
        maneja_stock: true,
        stock_minimo: 5,
      };
      const result = { id: '1', ...dto };
      jest.spyOn(productsService, 'create').mockResolvedValue(result as any);

      const response = await controller.create(dto);

      expect(response).toBe(result);
      expect(productsService.create).toHaveBeenCalledWith(dto);
      expect(productsService.create).toHaveBeenCalledTimes(1);
    });

    it('should call ProductsEsService.create with required fields only', async () => {
      const dto: CreateProductDto = {
        codigo: 'SKU-001',
        detalle: 'Producto simple',
      };
      const result = { id: '1', ...dto };
      jest.spyOn(productsService, 'create').mockResolvedValue(result as any);

      const response = await controller.create(dto);

      expect(response).toBe(result);
      expect(productsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateStock (PATCH /products/:id/stock)', () => {
    it('should dispatch UpdateStockCommand with quantity', async () => {
      const id = 'product-123';
      const quantity = 10;
      const result = { id, stock: 20 };
      jest.spyOn(commandBus, 'execute').mockResolvedValue(result);

      const response = await controller.updateStock(id, quantity);

      expect(response).toBe(result);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: id,
          quantity,
          type: 'ADJUSTMENT',
        }),
      );
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne (GET /products/:id)', () => {
    it('should call ProductsEsService.findOne (NO CQRS yet)', async () => {
      const id = 'product-123';
      const result = { id, name: 'Product 1' };
      jest.spyOn(productsService, 'findOne').mockResolvedValue(result as any);

      const response = await controller.findOne(id);

      expect(response).toBe(result);
      expect(productsService.findOne).toHaveBeenCalledWith(id);
      expect(queryBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('update (PATCH /products/:id)', () => {
    it('should call ProductsEsService.update (NO CQRS yet)', async () => {
      const id = 'product-123';
      const updateDto = { detalle: 'Producto actualizado' };
      const result = { id, ...updateDto };
      jest.spyOn(productsService, 'update').mockResolvedValue(result as any);

      const response = await controller.update(id, updateDto);

      expect(response).toBe(result);
      expect(productsService.update).toHaveBeenCalledWith(id, updateDto);
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('remove (DELETE /products/:id)', () => {
    it('should call ProductsEsService.remove (NO CQRS yet)', async () => {
      const id = 'product-123';
      const result = { id, isActive: false };
      jest.spyOn(productsService, 'remove').mockResolvedValue(result as any);

      const response = await controller.remove(id);

      expect(response).toBe(result);
      expect(productsService.remove).toHaveBeenCalledWith(id);
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('findBySku (GET /products/sku/:sku)', () => {
    it('should call ProductsEsService.findBySku (NO CQRS yet)', async () => {
      const sku = 'SKU-001';
      const result = { id: '1', sku };
      jest.spyOn(productsService, 'findBySku').mockResolvedValue(result as any);

      const response = await controller.findBySku(sku);

      expect(response).toBe(result);
      expect(productsService.findBySku).toHaveBeenCalledWith(sku);
    });
  });

  describe('findByBarcode (GET /products/barcode/:barcode)', () => {
    it('should call ProductsEsService.findByBarcode (NO CQRS yet)', async () => {
      const barcode = '123456789';
      const result = { id: '1', barcode };
      jest.spyOn(productsService, 'findByBarcode').mockResolvedValue(result as any);

      const response = await controller.findByBarcode(barcode);

      expect(response).toBe(result);
      expect(productsService.findByBarcode).toHaveBeenCalledWith(barcode);
    });
  });

  describe('getTotalInventoryValue (GET /products/total-value)', () => {
    it('should call ProductsEsService.getTotalInventoryValue (NO CQRS yet)', async () => {
      const result = { totalValue: 125430.5 };
      jest.spyOn(productsService, 'getTotalInventoryValue').mockResolvedValue(result as any);

      const response = await controller.getTotalInventoryValue();

      expect(response).toBe(result);
      expect(productsService.getTotalInventoryValue).toHaveBeenCalled();
    });
  });
});
