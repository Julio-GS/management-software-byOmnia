import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductHandler } from './create-product.handler';
import { ProductsEsService } from '../../products-es.service';
import { CreateProductCommand } from '../create-product.command';
import { createMockProducto } from '../../../shared/test-utils';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let productsService: jest.Mocked<ProductsEsService>;

  beforeEach(async () => {
    const mockProductsEsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductHandler,
        {
          provide: ProductsEsService,
          useValue: mockProductsEsService,
        },
      ],
    }).compile();

    handler = module.get<CreateProductHandler>(CreateProductHandler);
    productsService = module.get(ProductsEsService) as jest.Mocked<ProductsEsService>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call ProductsEsService.create with correct DTO when executing command', async () => {
    // Arrange
    const command = new CreateProductCommand(
      'Coca Cola 2.25L',
      'Gaseosa Coca Cola 2.25 litros',
      850,
      550,
      'BEB-001',
      '7790895001567',
      48,
      12,
      100,
      'cat-123',
      35,
      21,
      'https://example.com/image.jpg',
      true,
    );

    // Expected DTO should use SPANISH properties
    const expectedDto = {
      codigo: 'BEB-001',
      detalle: 'Coca Cola 2.25L',
      codigo_barras: '7790895001567',
      costo: 550,
      precio_venta: 850,
      iva: 21,
      stock_minimo: 12,
      rubro_id: 'cat-123',
      requiere_precio_manual: false,
      maneja_stock: true,
    };

    const mockProducto = createMockProducto({
      id: 'prod-123',
      detalle: 'Coca Cola 2.25L',
      codigo: 'BEB-001',
      precio_venta: 850,
    });

    productsService.create.mockResolvedValue(mockProducto);

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(productsService.create).toHaveBeenCalledWith(expectedDto);
    expect(productsService.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockProducto);
  });

  it('should handle optional fields correctly', async () => {
    // Arrange — minimal command with only required fields
    const command = new CreateProductCommand(
      'Water Bottle',
      undefined, // description optional
      50,
      30,
      'WAT-001',
    );

    const expectedDto = {
      codigo: 'WAT-001',
      detalle: 'Water Bottle',
      codigo_barras: undefined,
      costo: 30,
      precio_venta: 50,
      iva: undefined,
      stock_minimo: undefined,
      rubro_id: undefined,
      requiere_precio_manual: false,
      maneja_stock: true,
    };

    const mockProducto = createMockProducto({
      id: 'prod-456',
      detalle: 'Water Bottle',
      codigo: 'WAT-001',
      precio_venta: 50,
    });
    productsService.create.mockResolvedValue(mockProducto);

    // Act
    await handler.execute(command);

    // Assert
    expect(productsService.create).toHaveBeenCalledWith(expectedDto);
  });
});
