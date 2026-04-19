import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { PeriodType } from './dto/sales-summary.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: ReportsRepository;

  const mockReportsRepository = {
    getSalesSummary: jest.fn(),
    getSalesSummaryForPreviousPeriod: jest.fn(),
    getTopProducts: jest.fn(),
    getLowStockProducts: jest.fn(),
    getStockRotation: jest.fn(),
    getRevenueByCategory: jest.fn(),
    getSalesTrends: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: ReportsRepository,
          useValue: mockReportsRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    repository = module.get<ReportsRepository>(ReportsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesSummary', () => {
    it('should return sales summary for today', async () => {
      const mockSales = [
        {
          id: '1',
          totalAmount: new Decimal(100),
          items: [{ quantity: 5 }],
        },
        {
          id: '2',
          totalAmount: new Decimal(200),
          items: [{ quantity: 3 }],
        },
      ];

      const mockPreviousSales = [
        {
          id: '3',
          totalAmount: new Decimal(250),
          items: [{ quantity: 8 }],
        },
      ];

      mockReportsRepository.getSalesSummary.mockResolvedValue(mockSales);
      mockReportsRepository.getSalesSummaryForPreviousPeriod.mockResolvedValue(
        mockPreviousSales,
      );

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(result).toEqual({
        totalSales: 2,
        totalRevenue: 300,
        productsSold: 8,
        avgTransactionValue: 150,
        changeVsYesterday: 20, // (300-250)/250 * 100 = 20
      });
    });

    it('should handle zero sales', async () => {
      mockReportsRepository.getSalesSummary.mockResolvedValue([]);
      mockReportsRepository.getSalesSummaryForPreviousPeriod.mockResolvedValue([]);

      const result = await service.getSalesSummary(PeriodType.TODAY);

      expect(result).toEqual({
        totalSales: 0,
        totalRevenue: 0,
        productsSold: 0,
        avgTransactionValue: 0,
        changeVsYesterday: 0,
      });
    });
  });

  describe('getTopProducts', () => {
    it('should return top selling products', async () => {
      const mockTopProducts = [
        {
          productId: '1',
          name: 'Product A',
          quantitySold: 100,
          revenue: new Decimal(1000),
        },
        {
          productId: '2',
          name: 'Product B',
          quantitySold: 80,
          revenue: new Decimal(800),
        },
      ];

      mockReportsRepository.getTopProducts.mockResolvedValue(mockTopProducts);

      const result = await service.getTopProducts(10);

      expect(result).toEqual([
        {
          id: '1',
          name: 'Product A',
          quantitySold: 100,
          revenue: 1000,
        },
        {
          id: '2',
          name: 'Product B',
          quantitySold: 80,
          revenue: 800,
        },
      ]);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const mockLowStockProducts = [
        {
          id: '1',
          name: 'Product A',
          stock: 5,
          minStock: 10,
          category: { name: 'Category A' },
        },
        {
          id: '2',
          name: 'Product B',
          stock: 2,
          minStock: 20,
          category: { name: 'Category B' },
        },
      ];

      mockReportsRepository.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );

      const result = await service.getLowStockProducts();

      expect(result).toEqual([
        {
          id: '1',
          name: 'Product A',
          currentStock: 5,
          minStock: 10,
          categoryName: 'Category A',
        },
        {
          id: '2',
          name: 'Product B',
          currentStock: 2,
          minStock: 20,
          categoryName: 'Category B',
        },
      ]);
    });
  });

  describe('getStockRotation', () => {
    it('should return stock rotation metrics', async () => {
      const mockRotation = [
        {
          productId: '1',
          productName: 'Product A',
          averageDailySales: 10.5,
          currentStock: 100,
          daysUntilStockout: 9.52,
          rotationRate: 0.315,
        },
      ];

      mockReportsRepository.getStockRotation.mockResolvedValue(mockRotation);

      const result = await service.getStockRotation();

      expect(result).toEqual([
        {
          productId: '1',
          productName: 'Product A',
          averageDailySales: 10.5,
          currentStock: 100,
          daysUntilStockout: 9.5,
          rotationRate: 0.32,
        },
      ]);
    });
  });

  describe('getRevenueByCategory', () => {
    it('should return revenue breakdown by category', async () => {
      const mockRevenue = [
        {
          categoryId: '1',
          categoryName: 'Category A',
          revenue: new Decimal(1000),
          salesCount: 50,
          percentage: 66.67,
        },
        {
          categoryId: '2',
          categoryName: 'Category B',
          revenue: new Decimal(500),
          salesCount: 25,
          percentage: 33.33,
        },
      ];

      mockReportsRepository.getRevenueByCategory.mockResolvedValue(mockRevenue);

      const result = await service.getRevenueByCategory();

      expect(result).toEqual([
        {
          categoryId: '1',
          categoryName: 'Category A',
          revenue: 1000,
          salesCount: 50,
          percentage: 66.67,
        },
        {
          categoryId: '2',
          categoryName: 'Category B',
          revenue: 500,
          salesCount: 25,
          percentage: 33.33,
        },
      ]);
    });
  });

  describe('getSalesTrends', () => {
    it('should return sales trends for the specified number of days', async () => {
      const mockTrends = [
        {
          date: '2024-01-01',
          sales: 10,
          revenue: new Decimal(1000),
          productsSold: 50,
        },
        {
          date: '2024-01-02',
          sales: 15,
          revenue: new Decimal(1500),
          productsSold: 75,
        },
      ];

      mockReportsRepository.getSalesTrends.mockResolvedValue(mockTrends);

      const result = await service.getSalesTrends(7);

      expect(result).toEqual([
        {
          date: '2024-01-01',
          sales: 10,
          revenue: 1000,
          productsSold: 50,
        },
        {
          date: '2024-01-02',
          sales: 15,
          revenue: 1500,
          productsSold: 75,
        },
      ]);
    });
  });
});
