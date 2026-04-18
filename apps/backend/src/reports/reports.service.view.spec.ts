import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { PeriodType } from './dto/sales-summary.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReportsService - Materialized View', () => {
  let service: ReportsService;
  let repository: jest.Mocked<ReportsRepository>;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockRepository = {
      getSalesSummary: jest.fn(),
      getSalesSummaryForPreviousPeriod: jest.fn(),
      getSalesSummaryFromView: jest.fn(),
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
        ReportsService,
        { provide: ReportsRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    repository = module.get(ReportsRepository);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset environment for each test
    delete process.env.ENABLE_DASHBOARD_CACHE;
    delete process.env.ENABLE_DASHBOARD_VIEW;
  });

  describe('Feature flag: ENABLE_DASHBOARD_VIEW', () => {
    it('should query from materialized view when flag is true', async () => {
      process.env.ENABLE_DASHBOARD_VIEW = 'true';

      const viewData = [
        {
          date: new Date('2026-04-18'),
          total_sales: BigInt(10),
          total_revenue: new Decimal(1000),
          total_items_sold: BigInt(50),
        },
      ];

      repository.getSalesSummaryFromView.mockResolvedValue(viewData);

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(repository.getSalesSummaryFromView).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
      expect(repository.getSalesSummary).not.toHaveBeenCalled();
      expect(result.totalSales).toBe(10);
      expect(result.totalRevenue).toBe(1000);
      expect(result.productsSold).toBe(50);
    });

    it('should use old path (repository.getSalesSummary) when flag is false', async () => {
      process.env.ENABLE_DASHBOARD_VIEW = 'false';

      repository.getSalesSummary.mockResolvedValue([]);
      repository.getSalesSummaryForPreviousPeriod.mockResolvedValue([]);

      await service.getSalesSummary(PeriodType.TODAY);

      expect(repository.getSalesSummary).toHaveBeenCalled();
      expect(repository.getSalesSummaryFromView).not.toHaveBeenCalled();
    });
  });
});
