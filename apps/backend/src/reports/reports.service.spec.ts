import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: jest.Mocked<ReportsRepository>;
  let cacheManager: any;

  beforeEach(async () => {
    const mockRepository = {
      getStockActual: jest.fn().mockResolvedValue([]),
      getProximosVencer: jest.fn().mockResolvedValue([]),
      getSinMovimiento: jest.fn().mockResolvedValue([]),
      getPromocionesVigentes: jest.fn().mockResolvedValue([]),
      getVentasDiarias: jest.fn().mockResolvedValue([]),
      getEfectividadPromociones: jest.fn().mockResolvedValue([]),
      getSalesTrends: jest.fn().mockResolvedValue([]),
      getSalesSummaryFromView: jest.fn().mockResolvedValue([]),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call repository for getStockActual when not cached', async () => {
    cacheManager.get.mockResolvedValue(null);
    await service.getStockActual({ stock_bajo: true });
    expect(repository.getStockActual).toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it('should return cached data if available for getStockActual', async () => {
    cacheManager.get.mockResolvedValue(['cached']);
    const result = await service.getStockActual({ stock_bajo: true });
    expect(result).toEqual(['cached']);
    expect(repository.getStockActual).not.toHaveBeenCalled();
  });
});
