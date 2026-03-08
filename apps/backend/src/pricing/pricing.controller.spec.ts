import { Test, TestingModule } from '@nestjs/testing';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { UpdateGlobalMarkupDto } from './dto/update-global-markup.dto';

describe('PricingController', () => {
  let controller: PricingController;
  let pricingService: PricingService;

  const mockPricingService = {
    calculatePrice: jest.fn(),
    getApplicableMarkup: jest.fn(),
    updateGlobalMarkup: jest.fn(),
    recalculatePricesForCategory: jest.fn(),
    recalculatePricesGlobal: jest.fn(),
    recalculatePriceForProduct: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
      ],
    }).compile();

    controller = module.get<PricingController>(PricingController);
    pricingService = module.get<PricingService>(PricingService);

    // Prevent unused variable warnings
    void pricingService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculatePrice', () => {
    it('should calculate price with valid cost/productId/categoryId', async () => {
      const dto: CalculatePriceDto = {
        cost: 100,
        productId: 'prod-123',
        categoryId: 'cat-123',
      };

      const expectedResult = {
        calculatedPrice: 130,
        suggestedPrice: 130,
        markupPercentage: 30,
        markupSource: 'global' as const,
      };

      mockPricingService.calculatePrice.mockResolvedValue(expectedResult);

      const result = await controller.calculatePrice(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPricingService.calculatePrice).toHaveBeenCalledWith(
        100,
        'prod-123',
        'cat-123',
      );
    });

    it('should calculate price without productId/categoryId', async () => {
      const dto: CalculatePriceDto = {
        cost: 200,
      };

      const expectedResult = {
        calculatedPrice: 260,
        suggestedPrice: 250, // Rounded to nearest 50
        markupPercentage: 30,
        markupSource: 'global' as const,
      };

      mockPricingService.calculatePrice.mockResolvedValue(expectedResult);

      const result = await controller.calculatePrice(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPricingService.calculatePrice).toHaveBeenCalledWith(
        200,
        undefined,
        undefined,
      );
    });

    // NOTE: Validation errors (e.g., negative cost) are handled by class-validator DTOs
    // Those tests would be in e2e tests with actual HTTP requests
  });

  describe('getApplicableMarkup', () => {
    it('should return markup for a product', async () => {
      const expectedResult = {
        percentage: 40,
        source: 'product' as const,
      };

      mockPricingService.getApplicableMarkup.mockResolvedValue(expectedResult);

      const result = await controller.getApplicableMarkup('prod-123');

      expect(result).toEqual(expectedResult);
      expect(mockPricingService.getApplicableMarkup).toHaveBeenCalledWith('prod-123');
    });
  });

  describe('updateGlobalMarkup', () => {
    it('should update global markup (admin only)', async () => {
      const dto: UpdateGlobalMarkupDto = {
        markup: 35,
      };

      mockPricingService.updateGlobalMarkup.mockResolvedValue(undefined);

      const result = await controller.updateGlobalMarkup(dto);

      expect(result).toEqual({
        message: 'Global markup updated to 35%',
        percentage: 35,
      });
      expect(mockPricingService.updateGlobalMarkup).toHaveBeenCalledWith(35);
    });

    // NOTE: Authorization tests (@Roles('admin')) would be in e2e tests
    // with actual JWT tokens and guard execution
  });

  describe('recalculateCategoryPrices', () => {
    it('should recalculate prices for category and return count', async () => {
      mockPricingService.recalculatePricesForCategory.mockResolvedValue(15);

      const result = await controller.recalculateCategoryPrices('cat-123');

      expect(result).toEqual({
        message: 'Recalculated 15 product prices',
        count: 15,
      });
      expect(mockPricingService.recalculatePricesForCategory).toHaveBeenCalledWith(
        'cat-123',
      );
    });

    it('should return count of 0 when no products need recalculation', async () => {
      mockPricingService.recalculatePricesForCategory.mockResolvedValue(0);

      const result = await controller.recalculateCategoryPrices('cat-empty');

      expect(result).toEqual({
        message: 'Recalculated 0 product prices',
        count: 0,
      });
    });
  });

  describe('recalculateGlobalPrices', () => {
    it('should recalculate all prices using global markup (admin only)', async () => {
      mockPricingService.recalculatePricesGlobal.mockResolvedValue(50);

      const result = await controller.recalculateGlobalPrices();

      expect(result).toEqual({
        message: 'Recalculated 50 product prices',
        count: 50,
      });
      expect(mockPricingService.recalculatePricesGlobal).toHaveBeenCalled();
    });
  });

  describe('recalculateProductPrice', () => {
    it('should recalculate single product price', async () => {
      mockPricingService.recalculatePriceForProduct.mockResolvedValue(undefined);

      const result = await controller.recalculateProductPrice('prod-123');

      expect(result).toEqual({
        message: 'Product price recalculated successfully',
      });
      expect(mockPricingService.recalculatePriceForProduct).toHaveBeenCalledWith(
        'prod-123',
      );
    });
  });
});
