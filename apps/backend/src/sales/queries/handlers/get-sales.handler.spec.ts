import { Test, TestingModule } from '@nestjs/testing';
import { GetSalesHandler } from './get-sales.handler';
import { GetSalesQuery } from '../get-sales.query';
import { SalesService } from '../../sales.service';

describe('GetSalesHandler', () => {
  let handler: GetSalesHandler;
  let salesService: jest.Mocked<SalesService>;

  beforeEach(async () => {
    const mockSalesService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSalesHandler,
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    }).compile();

    handler = module.get<GetSalesHandler>(GetSalesHandler);
    salesService = module.get(SalesService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should call findAll with filters', async () => {
    const filters = {
      status: 'completed',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };
    const query = new GetSalesQuery(filters);

    const expectedResult = [
      { id: 1, saleNumber: 'SALE-001', total: 100 },
      { id: 2, saleNumber: 'SALE-002', total: 200 },
    ];
    salesService.findAll.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    // Note: SalesService.findAll doesn't support pagination yet (page, limit ignored)
    // TODO: Add pagination in future phase
    expect(salesService.findAll).toHaveBeenCalledWith(filters);
    expect(result).toEqual(expectedResult);
  });

  it('should call findAll without filters', async () => {
    const query = new GetSalesQuery();

    const expectedResult = [{ id: 1, saleNumber: 'SALE-001', total: 100 }];
    salesService.findAll.mockResolvedValue(expectedResult);

    const result = await handler.execute(query);

    expect(salesService.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(expectedResult);
  });
});
