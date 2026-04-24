import { Test, TestingModule } from '@nestjs/testing';
import { MarkupCalculatorService } from './markup-calculator.service';
import { PricingRepository } from '../repositories/pricing.repository';

describe('MarkupCalculatorService', () => {
  let service: MarkupCalculatorService;
  let repository: PricingRepository;

  const mockRepository = {
    getDefaultMarkupByRubro: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkupCalculatorService,
        {
          provide: PricingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarkupCalculatorService>(MarkupCalculatorService);
    repository = module.get<PricingRepository>(PricingRepository);
    void repository;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePrice', () => {
    it('should calculate price correctly with markup and IVA', () => {
      // costo 100, markup 30%, iva 21%
      // precio_sin_iva = 100 * (1 + 0.30) = 130
      // precio_final = 130 * (1 + 0.21) = 157.30
      const result = service.calculatePrice(100, 30, 21);
      expect(result).toBe(157.3);
    });

    it('should handle zero markup', () => {
      const result = service.calculatePrice(100, 0, 21);
      // precio_sin_iva = 100 * 1 = 100
      // precio_final = 100 * 1.21 = 121
      expect(result).toBe(121);
    });

    it('should handle zero IVA', () => {
      const result = service.calculatePrice(100, 30, 0);
      // precio_sin_iva = 130, precio_final = 130 (no IVA)
      expect(result).toBe(130);
    });

    it('should handle zero cost', () => {
      const result = service.calculatePrice(0, 30, 21);
      expect(result).toBe(0);
    });

    it('should throw on negative cost', () => {
      expect(() => service.calculatePrice(-100, 30, 21)).toThrow(
        'Cost, markup, and IVA must be non-negative',
      );
    });

    it('should throw on negative markup', () => {
      expect(() => service.calculatePrice(100, -30, 21)).toThrow(
        'Cost, markup, and IVA must be non-negative',
      );
    });

    it('should round to 2 decimal places', () => {
      // 100 * 1.3333... * 1.21 = 161.3333...
      const result = service.calculatePrice(100, 33.33, 21);
      expect(result).toBe(161.33);
    });
  });

  describe('calculateMarkup', () => {
    it('should calculate markup from cost and price', () => {
      // markup = (150/100 - 1) * 100 = 50%
      const result = service.calculateMarkup(100, 150);
      expect(result).toBe(50);
    });

    it('should return 0 when price is 0', () => {
      const result = service.calculateMarkup(100, 0);
      expect(result).toBe(0);
    });

    it('should throw when cost is 0', () => {
      expect(() => service.calculateMarkup(0, 150)).toThrow(
        'Cost must be greater than 0',
      );
    });

    it('should throw on negative cost', () => {
      expect(() => service.calculateMarkup(-100, 150)).toThrow(
        'Cost must be greater than 0',
      );
    });

    it('should handle price lower than cost (negative markup)', () => {
      // markup = (80/100 - 1) * 100 = -20%
      const result = service.calculateMarkup(100, 80);
      expect(result).toBe(-20);
    });

    it('should round to 2 decimal places', () => {
      // markup = (133.33/100 - 1) * 100 = 33.33%
      const result = service.calculateMarkup(100, 133.33);
      expect(result).toBe(33.33);
    });
  });

  describe('getDefaultMarkupByRubro', () => {
    it('should get default markup from repository', async () => {
      mockRepository.getDefaultMarkupByRubro.mockResolvedValue(35);

      const result = await service.getDefaultMarkupByRubro('rubro-123');

      expect(result).toBe(35);
      expect(mockRepository.getDefaultMarkupByRubro).toHaveBeenCalledWith('rubro-123');
    });
  });

  describe('calculateFull', () => {
    it('should return all price components', () => {
      const result = service.calculateFull(100, 30, 21);

      expect(result).toEqual({
        costo: 100,
        markup: 30,
        iva: 21,
        precio_sin_iva: 130,
        precio_final: 157.3,
      });
    });

    it('should throw on negative values', () => {
      expect(() => service.calculateFull(-100, 30, 21)).toThrow(
        'All values must be non-negative',
      );
    });
  });
});