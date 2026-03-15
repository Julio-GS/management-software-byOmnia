import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { PricingService } from './pricing.service';
import { PricingRepository } from './repositories/pricing.repository';

describe('PricingService', () => {
  let service: PricingService;
  let repository: PricingRepository;
  let eventBus: EventBus;

  const mockRepository = {
    getGlobalMarkup: jest.fn(),
    updateGlobalMarkup: jest.fn(),
    getProductMarkup: jest.fn(),
    getCategoryMarkup: jest.fn(),
    getProductForPriceCalculation: jest.fn(),
    getProductsInCategoryWithoutMarkup: jest.fn(),
    getProductsUsingGlobalMarkup: jest.fn(),
    updateProductPrice: jest.fn(),
    createPriceHistory: jest.fn(),
    getPriceHistoryByProduct: jest.fn(),
    getAllPriceHistory: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
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
        categoryId: 'cat-123',
      });

      mockRepository.getCategoryMarkup.mockResolvedValue(25); // Category has 25% markup

      const result = await service.calculatePrice(100, 'prod-123', 'cat-123');

      expect(result.calculatedPrice).toBe(140); // Uses product markup: 100 * 1.40
      expect(result.markupPercentage).toBe(40);
      expect(result.markupSource).toBe('product');
    });

    it('should use category markup over global markup', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null, // No product markup
        categoryId: 'cat-123',
      });

      mockRepository.getCategoryMarkup.mockResolvedValue(35); // Category has 35% markup

      const result = await service.calculatePrice(100, 'prod-123', 'cat-123');

      expect(result.calculatedPrice).toBe(135); // Uses category markup: 100 * 1.35
      expect(result.markupPercentage).toBe(35);
      expect(result.markupSource).toBe('category');
    });

    it('should fall back to category from product when no explicit categoryId', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null,
        categoryId: 'cat-456', // Product belongs to category
      });

      mockRepository.getCategoryMarkup.mockResolvedValue(20);

      const result = await service.calculatePrice(100, 'prod-123');

      expect(result.markupPercentage).toBe(20);
      expect(result.markupSource).toBe('category');
      expect(mockRepository.getCategoryMarkup).toHaveBeenCalledWith('cat-456');
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
        categoryId: 'cat-123',
      });

      const result = await service.getApplicableMarkup('prod-123', 'cat-123');

      expect(result.percentage).toBe(50);
      expect(result.source).toBe('product');
    });

    it('should return category markup when product has none', async () => {
      mockRepository.getProductMarkup.mockResolvedValue({
        markup: null,
        categoryId: 'cat-123',
      });

      mockRepository.getCategoryMarkup.mockResolvedValue(25);

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
    it('should update global markup setting', async () => {
      mockRepository.updateGlobalMarkup.mockResolvedValue(undefined);

      await service.updateGlobalMarkup(35);

      expect(mockRepository.updateGlobalMarkup).toHaveBeenCalledWith(35);
    });
  });

  describe('recalculatePricesForCategory', () => {
    it('should only recalculate products without own markup', async () => {
      const mockProducts = [
        { id: 'prod-1', cost: 100 },
        { id: 'prod-2', cost: 200 },
      ];

      mockRepository.getProductsInCategoryWithoutMarkup.mockResolvedValue(mockProducts);
      mockRepository.getCategoryMarkup.mockResolvedValue(30);
      mockRepository.updateProductPrice.mockResolvedValue(undefined);

      const count = await service.recalculatePricesForCategory('cat-123');

      expect(count).toBe(2);
      expect(mockRepository.getProductsInCategoryWithoutMarkup).toHaveBeenCalledWith('cat-123');
      expect(mockRepository.updateProductPrice).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip soft-deleted products', async () => {
      mockRepository.getProductsInCategoryWithoutMarkup.mockResolvedValue([]);

      const count = await service.recalculatePricesForCategory('cat-123');

      expect(count).toBe(0);
    });
  });

  describe('recalculatePricesGlobal', () => {
    it('should only recalculate products using global markup', async () => {
      const mockProducts = [
        { id: 'prod-1', cost: 100, categoryId: null },
        { id: 'prod-2', cost: 150, categoryId: null },
      ];

      mockRepository.getProductsUsingGlobalMarkup.mockResolvedValue(mockProducts);
      mockRepository.getGlobalMarkup.mockResolvedValue(30);
      mockRepository.updateProductPrice.mockResolvedValue(undefined);

      const count = await service.recalculatePricesGlobal();

      expect(count).toBe(2);
      expect(mockRepository.getProductsUsingGlobalMarkup).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip soft-deleted products', async () => {
      mockRepository.getProductsUsingGlobalMarkup.mockResolvedValue([]);

      const count = await service.recalculatePricesGlobal();

      expect(count).toBe(0);
    });
  });

  describe('recalculatePriceForProduct', () => {
    it('should recalculate price for a single product', async () => {
      mockRepository.getProductForPriceCalculation.mockResolvedValue({
        id: 'prod-123',
        cost: 100,
        categoryId: 'cat-123',
        deletedAt: null,
      });

      mockRepository.getCategoryMarkup.mockResolvedValue(30);
      mockRepository.updateProductPrice.mockResolvedValue(undefined);

      await service.recalculatePriceForProduct('prod-123');

      expect(mockRepository.updateProductPrice).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw error when product not found', async () => {
      mockRepository.getProductForPriceCalculation.mockResolvedValue(null);

      await expect(service.recalculatePriceForProduct('invalid-id')).rejects.toThrow(
        'Product invalid-id not found',
      );
    });

    it('should skip soft-deleted product and log warning', async () => {
      mockRepository.getProductForPriceCalculation.mockResolvedValue({
        id: 'prod-123',
        cost: 100,
        categoryId: null,
        deletedAt: new Date(), // Soft-deleted
      });

      await service.recalculatePriceForProduct('prod-123');

      expect(mockRepository.updateProductPrice).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
