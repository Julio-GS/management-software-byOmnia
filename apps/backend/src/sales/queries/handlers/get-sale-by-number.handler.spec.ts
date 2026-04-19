import { Test, TestingModule } from '@nestjs/testing';
import { GetSaleByNumberHandler } from './get-sale-by-number.handler';
import { GetSaleByNumberQuery } from '../get-sale-by-number.query';
import { SalesService } from '../../sales.service';

describe('GetSaleByNumberHandler', () => {
  let handler: GetSaleByNumberHandler;
  let salesService: jest.Mocked<SalesService>;

  beforeEach(async () => {
    const mockSalesService = {
      findBySaleNumber: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSaleByNumberHandler,
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    }).compile();

    handler = module.get<GetSaleByNumberHandler>(GetSaleByNumberHandler);
    salesService = module.get(SalesService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call findBySaleNumber with sale number', async () => {
    const saleNumber = 'SALE-001';
    const query = new GetSaleByNumberQuery(saleNumber);

    const expectedResult = { id: 1, saleNumber: 'SALE-001', total: 100 } as any;
    salesService.findBySaleNumber.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    expect(salesService.findBySaleNumber).toHaveBeenCalledWith(saleNumber);
    expect(result).toEqual(expectedResult);
  });

  it('should return null when sale not found', async () => {
    const saleNumber = 'SALE-999';
    const query = new GetSaleByNumberQuery(saleNumber);

    salesService.findBySaleNumber.mockResolvedValue(null);

    const result = await handler.execute(query);

    expect(salesService.findBySaleNumber).toHaveBeenCalledWith(saleNumber);
    expect(result).toBeNull();
  });
});
