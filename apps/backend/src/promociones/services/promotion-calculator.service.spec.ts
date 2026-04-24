import { Test, TestingModule } from '@nestjs/testing';
import { PromotionCalculatorService, CarritoItem } from './promotion-calculator.service';
import { PromocionesRepository } from '../repositories/promociones.repository';
import { PromocionEntity } from '../entities/promocion.entity';

describe('PromotionCalculatorService', () => {
  let service: PromotionCalculatorService;

  // Mock matches repository's exact method name
  const mockRepository = {
    findVigEntes: jest.fn(),  // Same as repo.findVigEntes (capital E)
    getProductos: jest.fn(),
  };

  const createPromocion = (partial: Partial<PromocionEntity>): PromocionEntity => {
    return new PromocionEntity(
      partial.id || 'promo-1',
      partial.nombre || 'Test Promo',
      partial.descripcion || null,
      partial.tipo || 'descuento_porcentaje',
      partial.valor_descuento ?? 10,
      partial.cantidad_requerida ?? null,
      partial.cantidad_bonificada ?? null,
      partial.precio_especial ?? null,
      partial.fecha_inicio || new Date('2024-01-01'),
      partial.fecha_fin || new Date('2024-12-31'),
      partial.dias_semana || [],
      partial.hora_inicio || null,
      partial.hora_fin || null,
      partial.cantidad_maxima_cliente ?? null,
      partial.acumulable ?? false,
      partial.activo ?? true,
      partial.prioridad ?? 0,
      partial.created_at || null,
    );
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionCalculatorService,
        { provide: PromocionesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PromotionCalculatorService>(PromotionCalculatorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aplicarPromocionesAutomaticas', () => {
    const cart: CarritoItem[] = [
      { producto_id: 'prod-1', cantidad: 2, precio_unitario: 100 },
      { producto_id: 'prod-2', cantidad: 1, precio_unitario: 50 },
    ];

    it('should return empty result when cart is empty', async () => {
      const result = await service.aplicarPromocionesAutomaticas([]);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return original prices when no promotions', async () => {
      mockRepository.findVigEntes.mockResolvedValue([]);

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.total).toBe(250);
      expect(result.descuento_total).toBe(0);
    });

    it('should apply percentage discount', async () => {
      const promo = createPromocion({
        id: 'promo-1',
        tipo: 'descuento_porcentaje',
        valor_descuento: 10,
        prioridad: 1,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo]);
      mockRepository.getProductos.mockResolvedValue([]);

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.descuento_total).toBe(25);
      expect(result.total).toBe(225);
    });

    it('should apply fixed amount discount', async () => {
      const promo = createPromocion({
        id: 'promo-2',
        tipo: 'descuento_monto',
        valor_descuento: 20,
        prioridad: 1,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.descuento_total).toBe(20);
      expect(result.total).toBe(230);
    });

    it('should apply cantidad_por_cantidad', async () => {
      const promo = createPromocion({
        id: 'promo-3',
        tipo: 'cantidad_por_cantidad',
        cantidad_requerida: 2,
        cantidad_bonificada: 1,
        prioridad: 1,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const cart2x1: CarritoItem[] = [
        { producto_id: 'prod-1', cantidad: 3, precio_unitario: 100 },
      ];

      const result = await service.aplicarPromocionesAutomaticas(cart2x1);

      expect(result.descuento_total).toBe(100);
    });

    it('should apply precio_especial', async () => {
      const promo = createPromocion({
        id: 'promo-4',
        tipo: 'precio_especial',
        precio_especial: 30,
        prioridad: 1,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo]);
      mockRepository.getProductos.mockResolvedValue(['prod-1']); // Only applies to prod-1

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.total).toBe(110);
    });

    it('should apply highest priority', async () => {
      const highPriority = createPromocion({
        id: 'promo-high',
        tipo: 'descuento_porcentaje',
        valor_descuento: 20,
        prioridad: 10,
      });
      const lowPriority = createPromocion({
        id: 'promo-low',
        tipo: 'descuento_porcentaje',
        valor_descuento: 10,
        prioridad: 5,
      });
      mockRepository.findVigEntes.mockResolvedValue([highPriority, lowPriority]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.descuento_total).toBe(50);
    });

    it('should NOT stack non-acumulable promotions', async () => {
      const promo1 = createPromocion({
        id: 'promo-1',
        tipo: 'descuento_porcentaje',
        valor_descuento: 15,
        prioridad: 10,
        acumulable: false,
      });
      const promo2 = createPromocion({
        id: 'promo-2',
        tipo: 'descuento_monto',
        valor_descuento: 30,
        prioridad: 5,
        acumulable: false,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo1, promo2]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.promociones_aplicadas).toHaveLength(1);
    });

    it('should stack acumulable promotions', async () => {
      const promo1 = createPromocion({
        id: 'promo-1',
        tipo: 'descuento_porcentaje',
        valor_descuento: 10,
        prioridad: 10,
        acumulable: true,
      });
      const promo2 = createPromocion({
        id: 'promo-2',
        tipo: 'descuento_monto',
        valor_descuento: 20,
        prioridad: 5,
        acumulable: true,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo1, promo2]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const result = await service.aplicarPromocionesAutomaticas(cart);

      expect(result.descuento_total).toBe(45);
      expect(result.promociones_aplicadas).toHaveLength(2);
    });

    it('should allow jubilados to stack with non-acumulable', async () => {
      const promo1 = createPromocion({
        id: 'promo-1',
        tipo: 'descuento_porcentaje',
        valor_descuento: 15,
        prioridad: 10,
        acumulable: false,
      });
      const promo2 = createPromocion({
        id: 'promo-2',
        tipo: 'descuento_monto',
        valor_descuento: 30,
        prioridad: 5,
        acumulable: false,
      });
      mockRepository.findVigEntes.mockResolvedValue([promo1, promo2]);
      mockRepository.getProductos.mockResolvedValue([]); // Applies to all products

      const result = await service.aplicarPromocionesAutomaticas(cart, true);

      expect(result.descuento_total).toBe(67.5);
    });
  });

  describe('calcularDescuentoItem', () => {
    it('should calculate percentage discount', () => {
      const item: CarritoItem = { producto_id: 'prod-1', cantidad: 2, precio_unitario: 100 };
      const promo = createPromocion({ tipo: 'descuento_porcentaje', valor_descuento: 20 });

      const descuento = service.calcularDescuentoItem(item, promo);
      expect(descuento).toBe(40);
    });

    it('should calculate fixed amount discount', () => {
      const item: CarritoItem = { producto_id: 'prod-1', cantidad: 3, precio_unitario: 100 };
      const promo = createPromocion({ tipo: 'descuento_monto', valor_descuento: 15 });

      const descuento = service.calcularDescuentoItem(item, promo);
      expect(descuento).toBe(15); // Fixed $15 discount, NOT $15 per unit
    });

    it('should calculate buy X get Y discount', () => {
      const item: CarritoItem = { producto_id: 'prod-1', cantidad: 4, precio_unitario: 50 };
      const promo = createPromocion({
        tipo: 'cantidad_por_cantidad',
        cantidad_requerida: 2,
        cantidad_bonificada: 1,
      });

      const descuento = service.calcularDescuentoItem(item, promo);
      expect(descuento).toBe(100);
    });

    it('should calculate precio_especial discount', () => {
      const item: CarritoItem = { producto_id: 'prod-1', cantidad: 2, precio_unitario: 100 };
      const promo = createPromocion({ tipo: 'precio_especial', precio_especial: 75 });

      const descuento = service.calcularDescuentoItem(item, promo);
      expect(descuento).toBe(50);
    });
  });

  describe('isPromocionVigente', () => {
    it('should return true when promotion is active', async () => {
      const promo = createPromocion({ id: 'promo-1' });
      mockRepository.findVigEntes.mockResolvedValue([promo]);

      const result = await service.isPromocionVigente('promo-1');
      expect(result).toBe(true);
    });

    it('should return false when promotion is not active', async () => {
      mockRepository.findVigEntes.mockResolvedValue([]);

      const result = await service.isPromocionVigente('promo-not-exists');
      expect(result).toBe(false);
    });
  });
});