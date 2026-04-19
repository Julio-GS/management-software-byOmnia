import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductHandler } from './create-product.handler';
import { ProductsService } from '../../products.service';
import { CreateProductCommand } from '../create-product.command';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let productsService: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const mockProductsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductHandler,
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    handler = module.get<CreateProductHandler>(CreateProductHandler);
    productsService = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call productsService.create with correct DTO when executing command', async () => {
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

    const expectedDto = {
      name: 'Coca Cola 2.25L',
      description: 'Gaseosa Coca Cola 2.25 litros',
      price: 850,
      cost: 550,
      sku: 'BEB-001',
      barcode: '7790895001567',
      stock: 48,
      minStock: 12,
      maxStock: 100,
      categoryId: 'cat-123',
      markup: 35,
      taxRate: 21,
      imageUrl: 'https://example.com/image.jpg',
      isActive: true,
    };

    const mockProduct = {
      id: 'prod-123',
      name: 'Coca Cola 2.25L',
      sku: 'BEB-001',
      price: 850,
    };

    productsService.create.mockResolvedValue(mockProduct);

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(productsService.create).toHaveBeenCalledWith(expectedDto);
    expect(productsService.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockProduct);
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
      name: 'Water Bottle',
      description: undefined,
      price: 50,
      cost: 30,
      sku: 'WAT-001',
      barcode: undefined,
      stock: undefined,
      minStock: undefined,
      maxStock: undefined,
      categoryId: undefined,
      markup: undefined,
      taxRate: undefined,
      imageUrl: undefined,
      isActive: undefined,
    };

    const mockProduct = { id: 'prod-456', name: 'Water Bottle', sku: 'WAT-001', price: 50 };
    productsService.create.mockResolvedValue(mockProduct);

    // Act
    await handler.execute(command);

    // Assert
    expect(productsService.create).toHaveBeenCalledWith(expectedDto);
  });
});
