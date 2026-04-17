import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PeriodType } from './dto/sales-summary.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReportsService - Caching', () => {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    repository = module.get(ReportsRepository);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset environment for each test
    delete process.env.ENABLE_DASHBOARD_CACHE;
  });

  describe('Cache HIT scenario', () => {
    it('should return cached data and NOT call repository when cache hit', async () => {
      process.env.ENABLE_DASHBOARD_CACHE = 'true';

      const cachedData = {
        totalSales: 100,
        totalRevenue: 50000,
        productsSold: 500,
        avgTransactionValue: 500,
        changeVsYesterday: 5.5,
      };

      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(cacheManager.get).toHaveBeenCalledWith('dashboard:metrics');
      expect(result).toEqual(cachedData);
      expect(repository.getSalesSummary).not.toHaveBeenCalled();
    });
  });

  describe('Cache MISS scenario', () => {
    it('should call repository and store result in cache when cache miss', async () => {
      process.env.ENABLE_DASHBOARD_CACHE = 'true';

      cacheManager.get.mockResolvedValue(undefined);

      const mockSales = [
        {
          id: 'sale-1',
          saleNumber: 'S-001',
          totalAmount: new Decimal(1000),
          items: [{ quantity: 5 }],
        },
        {
          id: 'sale-2',
          saleNumber: 'S-002',
          totalAmount: new Decimal(2000),
          items: [{ quantity: 10 }],
        },
      ];

      const mockPreviousSales = [
        {
          id: 'sale-prev-1',
          saleNumber: 'S-PREV-001',
          totalAmount: new Decimal(500),
          items: [{ quantity: 2 }],
        },
      ];

      repository.getSalesSummary.mockResolvedValue(mockSales as any);
      repository.getSalesSummaryForPreviousPeriod.mockResolvedValue(
        mockPreviousSales as any,
      );

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(cacheManager.get).toHaveBeenCalledWith('dashboard:metrics');
      expect(repository.getSalesSummary).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'dashboard:metrics',
        result,
        120000, // 2 min TTL
      );
      expect(result.totalSales).toBe(2);
      expect(result.totalRevenue).toBe(3000);
      expect(result.productsSold).toBe(15);
    });
  });

  describe('Cache disabled (feature flag OFF)', () => {
    it('should call repository directly when ENABLE_DASHBOARD_CACHE is false', async () => {
      process.env.ENABLE_DASHBOARD_CACHE = 'false';

      const mockSales = [
        {
          id: 'sale-1',
          saleNumber: 'S-001',
          totalAmount: new Decimal(1000),
          items: [{ quantity: 5 }],
        },
      ];

      const mockPreviousSales = [];

      repository.getSalesSummary.mockResolvedValue(mockSales as any);
      repository.getSalesSummaryForPreviousPeriod.mockResolvedValue(
        mockPreviousSales as any,
      );

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(repository.getSalesSummary).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result.totalSales).toBe(1);
    });

    it('should call repository directly when ENABLE_DASHBOARD_CACHE is not set', async () => {
      // process.env.ENABLE_DASHBOARD_CACHE is undefined

      const mockSales = [
        {
          id: 'sale-1',
          saleNumber: 'S-001',
          totalAmount: new Decimal(1000),
          items: [{ quantity: 5 }],
        },
      ];

      const mockPreviousSales = [];

      repository.getSalesSummary.mockResolvedValue(mockSales as any);
      repository.getSalesSummaryForPreviousPeriod.mockResolvedValue(
        mockPreviousSales as any,
      );

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(repository.getSalesSummary).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result.totalSales).toBe(1);
    });
  });
});
