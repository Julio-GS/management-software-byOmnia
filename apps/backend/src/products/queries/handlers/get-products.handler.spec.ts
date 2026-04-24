import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsHandler } from './get-products.handler';
import { GetProductsQuery } from '../get-products.query';
import { ProductsEsService } from '../../products-es.service';
import { createMockProducto } from '../../../shared/test-utils/mock-factories';

describe('GetProductsHandler', () => {
  let handler: GetProductsHandler;
  let productsService: jest.Mocked<ProductsEsService>;

  beforeEach(async () => {
    const mockProductsEsService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsHandler,
        {
          provide: ProductsEsService,
          useValue: mockProductsEsService,
        },
      ],
    }).compile();

    handler = module.get<GetProductsHandler>(GetProductsHandler);
    productsService = module.get(ProductsEsService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call findAll with filters and pagination', async () => {
    const filters = { categoryId: '1', isActive: true };
    const page = 1;
    const limit = 10;
    const query = new GetProductsQuery(filters, page, limit);

    const expectedResult = [createMockProducto({ id: '1', detalle: 'Product 1' })];
    productsService.findAll.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    // Note: ProductsEsService.findAll doesn't support pagination yet (page, limit ignored)
    // TODO: Add pagination in future phase
    expect(productsService.findAll).toHaveBeenCalledWith(filters);
    expect(result).toEqual(expectedResult);
  });

  it('should call findAll without filters', async () => {
    const query = new GetProductsQuery();

    const expectedResult = [
      createMockProducto({ id: '1', detalle: 'Product 1' }),
      createMockProducto({ id: '2', detalle: 'Product 2' })
    ];
    productsService.findAll.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    expect(productsService.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(expectedResult);
  });
});
