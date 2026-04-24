import { Test, TestingModule } from '@nestjs/testing';
import { GetLowStockHandler } from './get-low-stock.handler';
import { GetLowStockQuery } from '../get-low-stock.query';
import { ProductsEsService } from '../../products-es.service';
import { createMockProducto } from '../../../shared/test-utils/mock-factories';

describe('GetLowStockHandler', () => {
  let handler: GetLowStockHandler;
  let productsService: jest.Mocked<ProductsEsService>;

  beforeEach(async () => {
    const mockProductsEsService = {
      getLowStockProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLowStockHandler,
        {
          provide: ProductsEsService,
          useValue: mockProductsEsService,
        },
      ],
    }).compile();

    handler = module.get<GetLowStockHandler>(GetLowStockHandler);
    productsService = module.get(ProductsEsService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call getLowStockProducts with custom threshold', async () => {
    const threshold = 10;
    const query = new GetLowStockQuery(threshold);

    const expectedResult = [
      createMockProducto({ id: '1', detalle: 'Product 1', stock_minimo: 10 }),
      createMockProducto({ id: '2', detalle: 'Product 2', stock_minimo: 15 }),
    ];
    productsService.getLowStockProducts.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    // Note: ProductsEsService.getLowStockProducts doesn't support threshold param yet
    // It uses product.minStock for comparison (threshold ignored for now)
    // TODO: Add threshold support in future phase
    expect(productsService.getLowStockProducts).toHaveBeenCalledWith();
    expect(result).toEqual(expectedResult);
  });

  it('should call getLowStockProducts without threshold', async () => {
    const query = new GetLowStockQuery();

    const expectedResult = [
      createMockProducto({ id: '1', detalle: 'Product 1', stock_minimo: 10 })
    ];
    productsService.getLowStockProducts.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    expect(productsService.getLowStockProducts).toHaveBeenCalledWith();
    expect(result).toEqual(expectedResult);
  });
});
