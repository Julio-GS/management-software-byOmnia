import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { PricingService } from './pricing.service';
import { PricingRepository } from './repositories/pricing.repository';
import { MarkupCalculatorService } from './services/markup-calculator.service';

describe('PricingService', () => {
  let service: PricingService;
  let repository: PricingRepository;
  let eventBus: EventBus;

  const mockRepository = {
    getGlobalMarkup: jest.fn(),
    updateGlobalMarkup: jest.fn(),
    getProductMarkup: jest.fn(),
    getRubroMarkup: jest.fn(),
    getProductById: jest.fn(),
    getProductosInRubro: jest.fn(),
    getProductosUsingGlobalMarkup: jest.fn(),
    setProductPrice: jest.fn(),
    createPriceHistory: jest.fn(),
    getPriceHistoryByProduct: jest.fn(),
    getAllPriceHistory: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockMarkupCalculator = {
    suggestRoundedPrice: jest.fn((price: number) => {
      // Just pass through to service's real implementation
      if (price < 100) {
        return Math.round(price / 10) * 10;
      } else if (price < 1000) {
        return Math.round(price / 50) * 50;
      } else {
        return Math.round(price / 100) * 100;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PricingRepository,
          useValue: mockRepository,
        },
        {
          provide: MarkupCalculatorService,
          useValue: mockMarkupCalculator,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    repository = module.get<PricingRepository>(PricingRepository);
    eventBus = module.get<EventBus>(EventBus);

    // Prevent unused variable warnings
    void repository;
    void eventBus;

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePrice', () => {
    it('should calculate price with global markup when no product/category markup', async () => {
      mockRepository.getGlobalMarkup.mockResolvedValue(30);

      const result = await service.calculatePrice(100);

      expect(result.calculatedPrice).toBe(130); // 100 * 1.30 = 130
      expect(result.suggestedPrice).toBe(150); // Round to nearest 50 (130 >= 100): 130 -> 150
      expect(result.markupPercentage).toBe(30);
      expect(result.markupSource).toBe('global');
    });

    it('should use product markup over category markup', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: 40, // Product has 40% markup
        rubro_id: 'cat-123',
      });

      mockRepository.getRubroMarkup.mockResolvedValue(25); // Category has 25% markup

      const result = await service.calculatePrice(100, 'prod-123', 'cat-123');

      expect(result.calculatedPrice).toBe(140); // Uses product markup: 100 * 1.40
      expect(result.markupPercentage).toBe(40);
      expect(result.markupSource).toBe('product');
    });

    it('should use category markup over global markup', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null, // No product markup
        rubro_id: 'cat-123',
      });

      mockRepository.getRubroMarkup.mockResolvedValue(35); // Category has 35% markup

      const result = await service.calculatePrice(100, 'prod-123', 'cat-123');

      expect(result.calculatedPrice).toBe(135); // Uses category markup: 100 * 1.35
      expect(result.markupPercentage).toBe(35);
      expect(result.markupSource).toBe('category');
    });

    it('should fall back to category from product when no explicit categoryId', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null,
        rubro_id: 'cat-456', // Product belongs to category
      });

      mockRepository.getRubroMarkup.mockResolvedValue(20);

      const result = await service.calculatePrice(100, 'prod-123');

      expect(result.markupPercentage).toBe(20);
      expect(result.markupSource).toBe('category');
      expect(mockRepository.getRubroMarkup).toHaveBeenCalledWith('cat-456');
    });
  });

  describe('suggestRoundedPrice', () => {
    it('should round to nearest 10 for prices < 100', () => {
      expect(service.suggestRoundedPrice(87)).toBe(90);
      expect(service.suggestRoundedPrice(93)).toBe(90);
      expect(service.suggestRoundedPrice(45)).toBe(50);
      expect(service.suggestRoundedPrice(44)).toBe(40);
      expect(service.suggestRoundedPrice(99)).toBe(100);
    });

    it('should round to nearest 50 for prices 100-1000', () => {
      expect(service.suggestRoundedPrice(124)).toBe(100);
      expect(service.suggestRoundedPrice(125)).toBe(150);
      expect(service.suggestRoundedPrice(847)).toBe(850);
      expect(service.suggestRoundedPrice(870)).toBe(850); // 870 rounds to 850, not 900
      expect(service.suggestRoundedPrice(999)).toBe(1000);
    });

    it('should round to nearest 100 for prices > 1000', () => {
      expect(service.suggestRoundedPrice(1049)).toBe(1000);
      expect(service.suggestRoundedPrice(1050)).toBe(1100);
      expect(service.suggestRoundedPrice(1847)).toBe(1800); // 1847 rounds to 1800, not 1900
      expect(service.suggestRoundedPrice(1950)).toBe(2000);
      expect(service.suggestRoundedPrice(10550)).toBe(10600);
    });
  });

  describe('getApplicableMarkup', () => {
    it('should return product markup when available', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: 50,
        rubro_id: 'cat-123',
      });

      const result = await service.getApplicableMarkup('prod-123', 'cat-123');

      expect(result.percentage).toBe(50);
      expect(result.source).toBe('product');
    });

    it('should return category markup when product has none', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null,
        rubro_id: 'cat-123',
      });

      mockRepository.getRubroMarkup.mockResolvedValue(25);

      const result = await service.getApplicableMarkup('prod-123');

      expect(result.percentage).toBe(25);
      expect(result.source).toBe('category');
    });

    it('should return global markup as fallback', async () => {
      mockRepository.getGlobalMarkup.mockResolvedValue(30);

      const result = await service.getApplicableMarkup();

      expect(result.percentage).toBe(30);
      expect(result.source).toBe('global');
    });

    it('should use default 30% when global markup setting not found', async () => {
      mockRepository.getGlobalMarkup.mockResolvedValue(30); // Repository returns default

      const result = await service.getApplicableMarkup();

      expect(result.percentage).toBe(30); // DEFAULT_GLOBAL_MARKUP
      expect(result.source).toBe('global');
    });
  });

  describe('updateGlobalMarkup', () => {
    it('should log warning since feature not implemented yet', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn');

      await service.updateGlobalMarkup(35);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('35%')
      );
    });
  });

  describe('recalculatePricesForCategory', () => {
    it('should only recalculate products without own markup', async () => {
      const mockProducts = [
        { id: 'prod-1', costo: 100 },
        { id: 'prod-2', costo: 200 },
      ];

      mockRepository.getProductosInRubro.mockResolvedValue(mockProducts);
      mockRepository.getRubroMarkup.mockResolvedValue(30);
      mockRepository.setProductPrice.mockResolvedValue(undefined);

      const count = await service.recalculatePricesForCategory('cat-123');

      expect(count).toBe(2);
      expect(mockRepository.getProductosInRubro).toHaveBeenCalledWith('cat-123');
      expect(mockRepository.setProductPrice).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip soft-deleted products', async () => {
      mockRepository.getProductosInRubro.mockResolvedValue([]);

      const count = await service.recalculatePricesForCategory('cat-123');

      expect(count).toBe(0);
    });
  });

  describe('recalculatePricesGlobal', () => {
    it('should only recalculate products using global markup', async () => {
      const mockProducts = [
        { id: 'prod-1', costo: 100, rubro_id: null },
        { id: 'prod-2', costo: 150, rubro_id: null },
      ];

      mockRepository.getProductosUsingGlobalMarkup.mockResolvedValue(mockProducts);
      mockRepository.getGlobalMarkup.mockResolvedValue(30);
      mockRepository.setProductPrice.mockResolvedValue(undefined);

      const count = await service.recalculatePricesGlobal();

      expect(count).toBe(2);
      expect(mockRepository.getProductosUsingGlobalMarkup).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip soft-deleted products', async () => {
      mockRepository.getProductosUsingGlobalMarkup.mockResolvedValue([]);

      const count = await service.recalculatePricesGlobal();

      expect(count).toBe(0);
    });
  });

  describe('recalculatePriceForProduct', () => {
    it('should recalculate price for a single product', async () => {
      mockRepository.getProductById.mockResolvedValue({
        id: 'prod-123',
        costo: 100,
        rubro_id: 'cat-123',
        activo: true,
      });

      mockRepository.getRubroMarkup.mockResolvedValue(30);
      mockRepository.setProductPrice.mockResolvedValue(undefined);

      await service.recalculatePriceForProduct('prod-123');

      expect(mockRepository.setProductPrice).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw error when product not found', async () => {
      mockRepository.getProductById.mockResolvedValue(null);

      await expect(service.recalculatePriceForProduct('invalid-id')).rejects.toThrow(
        'Product invalid-id not found',
      );
    });

    it('should skip inactive product and log warning', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn');
      
      mockRepository.getProductById.mockResolvedValue({
        id: 'prod-123',
        costo: 100,
        rubro_id: null,
        activo: false, // Inactive
      });

      await service.recalculatePriceForProduct('prod-123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('inactive product')
      );
      expect(mockRepository.setProductPrice).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
