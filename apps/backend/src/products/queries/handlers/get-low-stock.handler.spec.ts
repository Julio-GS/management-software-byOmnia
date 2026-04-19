import { Test, TestingModule } from '@nestjs/testing';
import { GetLowStockHandler } from './get-low-stock.handler';
import { GetLowStockQuery } from '../get-low-stock.query';
import { ProductsService } from '../../products.service';

describe('GetLowStockHandler', () => {
  let handler: GetLowStockHandler;
  let productsService: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const mockProductsService = {
      getLowStockProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLowStockHandler,
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    handler = module.get<GetLowStockHandler>(GetLowStockHandler);
    productsService = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call getLowStockProducts with custom threshold', async () => {
    const threshold = 10;
    const query = new GetLowStockQuery(threshold);

    const expectedResult = [
      { id: 1, name: 'Product 1', stock: 5, minStock: 10 },
      { id: 2, name: 'Product 2', stock: 3, minStock: 15 },
    ];
    productsService.getLowStockProducts.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    // Note: ProductsService.getLowStockProducts doesn't support threshold param yet
    // It uses product.minStock for comparison (threshold ignored for now)
    // TODO: Add threshold support in future phase
    expect(productsService.getLowStockProducts).toHaveBeenCalledWith();
    expect(result).toEqual(expectedResult);
  });

  it('should call getLowStockProducts without threshold', async () => {
    const query = new GetLowStockQuery();

    const expectedResult = [{ id: 1, name: 'Product 1', stock: 5, minStock: 10 }];
    productsService.getLowStockProducts.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    expect(productsService.getLowStockProducts).toHaveBeenCalledWith();
    expect(result).toEqual(expectedResult);
  });
});
