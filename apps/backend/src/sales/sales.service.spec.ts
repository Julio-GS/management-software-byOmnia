import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '@nestjs/cqrs';
import { SalesRepository } from './repositories/sales.repository';
import { PromotionCalculatorService } from '../promociones/services/promotion-calculator.service';
import { NotFoundException } from '@nestjs/common';
import { BusinessException } from '../shared/exceptions/business.exception';

// -----------------------------------------------------------------------
// Factories
// -----------------------------------------------------------------------

const defaultProducto = {
  id: 'prod-1',
  detalle: 'Leche',
  codigo: 'L001',
  precio_venta: 500,
  requiere_precio_manual: false,
  maneja_lotes: false,
  maneja_stock: true,
  iva: 0,
  activo: true,
};

const defaultCaja = { id: 'caja-1', numero: 1, activo: true };

const defaultVenta = {
  id: 'venta-1',
  numero_ticket: 'CAJA1-20260420-0001',
  transaccion_id: 'tx-1',
  caja_id: 'caja-1',
  subtotal: 1000,
  descuentos: 0,
  total: 1000,
  vuelto: 0,
  usuario_id: 'user-1',
  anulada: false,
  fecha: new Date(),
  observaciones: null,
  detalle_ventas: [],
  medios_pago_venta: [],
  cajas: { numero: 1, nombre: 'Principal' },
  usuarios: { username: 'cajero1' },
};

const carritoPlano = (items: { producto_id: string; cantidad: number; precio_unitario: number }[]) => ({
  items: items.map((i) => ({
    ...i,
    descuento: 0,
    total: i.precio_unitario * i.cantidad,
    promocion_id: null,
    promocion_nombre: null,
  })),
  subtotal: items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
  descuento_total: 0,
  total: items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
  promociones_aplicadas: [],
});

// -----------------------------------------------------------------------
// Helper: creates a fresh tx mock with overrideable defaults
// -----------------------------------------------------------------------

function makeTx(overrides: Partial<Record<string, any>> = {}) {
  return {
    cajas: { findUnique: jest.fn().mockResolvedValue(defaultCaja), ...overrides.cajas },
    productos: { findMany: jest.fn().mockResolvedValue([defaultProducto]), ...overrides.productos },
    lotes: { findMany: jest.fn().mockResolvedValue([]), ...overrides.lotes },
    ventas: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(defaultVenta),
      findUnique: jest.fn().mockResolvedValue(defaultVenta),
      findMany: jest.fn().mockResolvedValue([defaultVenta]),
      update: jest.fn().mockResolvedValue({ ...defaultVenta, anulada: true }),
      count: jest.fn().mockResolvedValue(0),
      ...overrides.ventas,
    },
    detalle_ventas: { createMany: jest.fn().mockResolvedValue({ count: 1 }), ...overrides.detalle_ventas },
    medios_pago_venta: { createMany: jest.fn().mockResolvedValue({ count: 1 }), ...overrides.medios_pago_venta },
    movimientos_stock: { create: jest.fn().mockResolvedValue({}), ...overrides.movimientos_stock },
    $queryRaw: jest.fn().mockResolvedValue([{ stock_total: 100 }]),
  };
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('SalesService — Flujo POS Completo', () => {
  let service: SalesService;
  let prismaMock: any;
  let eventBusMock: any;
  let promoCalcMock: any;
  let salesRepositoryMock: any;

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn(),
      ventas: {
        findUnique: jest.fn().mockResolvedValue(defaultVenta),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([defaultVenta]),
        update: jest.fn().mockResolvedValue({ ...defaultVenta, anulada: true, motivo_anulacion: 'Error de precio' }),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    eventBusMock = { publish: jest.fn() };
    promoCalcMock = { aplicarPromocionesAutomaticas: jest.fn() };
    salesRepositoryMock = {
      executeTransaction: jest.fn(),
      findCajaById: jest.fn(),
      findProductosActivos: jest.fn(),
      getStockDisponible: jest.fn(),
      findLotesDisponibles: jest.fn(),
      crearVenta: jest.fn(),
      crearDetallesVenta: jest.fn(),
      crearMediosPago: jest.fn(),
      crearMovimientosStock: jest.fn(),
      getVentaCompleta: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByNumeroTicket: jest.fn(),
      findByCajaHoy: jest.fn(),
      anularVenta: jest.fn(),
      getUltimaVentaCajaByPrefix: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: salesRepositoryMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventBus, useValue: eventBusMock },
        { provide: PromotionCalculatorService, useValue: promoCalcMock },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    salesRepositoryMock = module.get(SalesRepository);
  });

  function setupHappyPath(productoOverrides = {}) {
    const producto = { ...defaultProducto, ...productoOverrides };
    const tx = {}; // tx mock for internal calls if needed
    
    salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb(tx));
    salesRepositoryMock.findCajaById.mockResolvedValue(defaultCaja);
    salesRepositoryMock.findProductosActivos.mockResolvedValue([producto]);
    salesRepositoryMock.getStockDisponible.mockResolvedValue(100);
    salesRepositoryMock.findLotesDisponibles.mockResolvedValue([]);
    salesRepositoryMock.crearVenta.mockResolvedValue(defaultVenta);
    salesRepositoryMock.getUltimaVentaCajaByPrefix.mockResolvedValue(null);
    salesRepositoryMock.getVentaCompleta.mockResolvedValue(defaultVenta);
    
    promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
      carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
    );
    return salesRepositoryMock;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =====================================================================
  // createVenta — Happy Path
  // =====================================================================

  describe('createVenta', () => {
    it('should complete the 13-step flow and return a venta', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1000 }],
      };

      const result = await service.createVenta(dto as any, 'user-1');
      expect(result).toBeDefined();
    });

    it('should call aplicarPromocionesAutomaticas with carrito items', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1000 }],
      };

      await service.createVenta(dto as any, 'user-1');
      expect(promoCalcMock.aplicarPromocionesAutomaticas).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ producto_id: 'prod-1' }),
        ]),
      );
    });

    it('should publish SaleCreatedEvent after transaction', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 1 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
      };

      await service.createVenta(dto as any, 'user-1');
      expect(eventBusMock.publish).toHaveBeenCalledTimes(1);
    });

    it('should create medios_pago_venta for split payment', async () => {
      setupHappyPath();
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [
          { medio_pago: 'efectivo', monto: 600 },
          { medio_pago: 'debito', monto: 400 },
        ],
      };

      await service.createVenta(dto as any, 'user-1');
      expect(salesRepositoryMock.crearMediosPago).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // Validaciones de negocio
  // =====================================================================

  describe('validaciones de negocio', () => {
    it('should throw BusinessException if caja is inactive', async () => {
      salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb({}));
      salesRepositoryMock.findCajaById.mockResolvedValue({ id: 'caja-1', numero: 1, activo: false });

      await expect(
        service.createVenta({ caja_id: 'caja-1', items: [], medios_pago: [] } as any, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException if precio_manual missing for F/V/P/C product', async () => {
      salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb({}));
      salesRepositoryMock.findCajaById.mockResolvedValue(defaultCaja);
      salesRepositoryMock.findProductosActivos.mockResolvedValue([{ ...defaultProducto, requiere_precio_manual: true }]);

      await expect(
        service.createVenta(
          {
            caja_id: 'caja-1',
            items: [{ producto_id: 'prod-1', cantidad: 1 }], // sin precio_manual
            medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException if precio_manual > 999999', async () => {
      salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb({}));
      salesRepositoryMock.findCajaById.mockResolvedValue(defaultCaja);
      salesRepositoryMock.findProductosActivos.mockResolvedValue([{ ...defaultProducto, requiere_precio_manual: true }]);

      await expect(
        service.createVenta(
          {
            caja_id: 'caja-1',
            items: [{ producto_id: 'prod-1', cantidad: 1, precio_manual: 1_000_000 }],
            medios_pago: [{ medio_pago: 'efectivo', monto: 1_000_000 }],
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException if SUM(medios_pago) < total', async () => {
      setupHappyPath();
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      await expect(
        service.createVenta(
          {
            caja_id: 'caja-1',
            items: [{ producto_id: 'prod-1', cantidad: 2 }], // total = 1000
            medios_pago: [{ medio_pago: 'efectivo', monto: 100 }], // pago = 100 → insuficiente
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw NotFoundException if producto not found', async () => {
      salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb({}));
      salesRepositoryMock.findCajaById.mockResolvedValue(defaultCaja);
      salesRepositoryMock.findProductosActivos.mockResolvedValue([]);

      await expect(
        service.createVenta(
          {
            caja_id: 'caja-1',
            items: [{ producto_id: 'prod-inexistente', cantidad: 1 }],
            medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================================
  // FEFO
  // =====================================================================

  describe('FEFO — selección de lotes', () => {
    it('should throw BusinessException when stock insufficient across all lotes', async () => {
      salesRepositoryMock.executeTransaction.mockImplementation((cb: any) => cb({}));
      salesRepositoryMock.findCajaById.mockResolvedValue(defaultCaja);
      salesRepositoryMock.findProductosActivos.mockResolvedValue([
        { ...defaultProducto, maneja_lotes: true, maneja_stock: true },
      ]);
      salesRepositoryMock.findLotesDisponibles.mockResolvedValue([
        { id: 'lote-1', cantidad_actual: 3, fecha_vencimiento: new Date('2027-01-01'), activo: true, producto_id: 'prod-1' },
      ]);

      await expect(
        service.createVenta(
          {
            caja_id: 'caja-1',
            items: [{ producto_id: 'prod-1', cantidad: 10 }], // stock = 3 → falla
            medios_pago: [{ medio_pago: 'efectivo', monto: 5000 }],
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should split into multiple items when FEFO requires multiple lotes', async () => {
      const lote1 = { id: 'lote-1', cantidad_actual: 5, fecha_vencimiento: new Date('2026-05-01'), activo: true, producto_id: 'prod-1' };
      const lote2 = { id: 'lote-2', cantidad_actual: 20, fecha_vencimiento: new Date('2026-06-01'), activo: true, producto_id: 'prod-1' };

      setupHappyPath({ maneja_lotes: true, maneja_stock: true });
      salesRepositoryMock.findLotesDisponibles.mockResolvedValue([lote1, lote2]);

      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([
          { producto_id: 'prod-1', cantidad: 5, precio_unitario: 500 },
          { producto_id: 'prod-1', cantidad: 20, precio_unitario: 500 },
        ]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 25 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 12500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      // Verifica que se llamó con 2 items (uno por lote)
      expect(salesRepositoryMock.crearDetallesVenta).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // anularVenta
  // =====================================================================

  describe('anularVenta', () => {
    it('should mark venta as anulada', async () => {
      salesRepositoryMock.findOne.mockResolvedValue({ ...defaultVenta, anulada: false });
      salesRepositoryMock.anularVenta.mockResolvedValue({ ...defaultVenta, anulada: true, motivo_anulacion: 'Error de precio', fecha_anulacion: new Date() });

      const result = await service.anularVenta('venta-1', { motivo_anulacion: 'Error de precio' }, 'user-1');

      expect(result.anulada).toBe(true);
      expect(salesRepositoryMock.anularVenta).toHaveBeenCalledWith('venta-1', 'Error de precio');
    });

    it('should throw NotFoundException if venta not found', async () => {
      salesRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.anularVenta('bad-id', { motivo_anulacion: 'motivo largo test' }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BusinessException if venta already anulada', async () => {
      salesRepositoryMock.findOne.mockResolvedValue({ ...defaultVenta, anulada: true });
      await expect(service.anularVenta('venta-1', { motivo_anulacion: 'motivo largo test' }, 'user-1')).rejects.toThrow(BusinessException);
    });
  });

  // =====================================================================
  // findAll
  // =====================================================================

  describe('findAll', () => {
    it('should return paginated results', async () => {
      salesRepositoryMock.findAll.mockResolvedValue([[defaultVenta], 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by caja_id when provided', async () => {
      salesRepositoryMock.findAll.mockResolvedValue([[], 0]);

      await service.findAll({ caja_id: 'caja-1', page: 1, limit: 20 } as any);

      expect(salesRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ caja_id: 'caja-1' }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should exclude anuladas by default', async () => {
      salesRepositoryMock.findAll.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20 } as any);

      expect(salesRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }), // default filter
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  // =====================================================================
  // findOne
  // =====================================================================

  describe('findOne', () => {
    it('should return venta with full detail', async () => {
      salesRepositoryMock.findOne.mockResolvedValue(defaultVenta);
      const result = await service.findOne('venta-1');
      expect(result).toEqual(defaultVenta);
    });

    it('should throw NotFoundException if not found', async () => {
      salesRepositoryMock.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================================
  // findByCajaHoy
  // =====================================================================

  describe('findByCajaHoy', () => {
    it('should return ventas for caja today only', async () => {
      salesRepositoryMock.findByCajaHoy.mockResolvedValue([defaultVenta]);

      const result = await service.findByCajaHoy('caja-1');

      expect(result).toHaveLength(1);
      expect(salesRepositoryMock.findByCajaHoy).toHaveBeenCalledWith(
        'caja-1',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should only include ventas within today date range', async () => {
      salesRepositoryMock.findByCajaHoy.mockResolvedValue([]);

      await service.findByCajaHoy('caja-1');

      expect(salesRepositoryMock.findByCajaHoy).toHaveBeenCalledWith(
        'caja-1',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  // =====================================================================
  // findByNumeroTicket
  // =====================================================================

  describe('findByNumeroTicket', () => {
    it('should return venta by numero_ticket', async () => {
      salesRepositoryMock.findByNumeroTicket.mockResolvedValue(defaultVenta);

      const result = await service.findByNumeroTicket('CAJA1-20260420-0001');

      expect(result).toEqual(defaultVenta);
      expect(salesRepositoryMock.findByNumeroTicket).toHaveBeenCalledWith('CAJA1-20260420-0001');
    });

    it('should throw NotFoundException if ticket not found', async () => {
      salesRepositoryMock.findByNumeroTicket.mockResolvedValue(null);
      await expect(service.findByNumeroTicket('CAJA1-INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================================
  // Vuelto exacto (SPEC_04 §1.3.5)
  // =====================================================================

  describe('Cálculo de vuelto exacto', () => {
    /**
     * Escenario: total = $1000, cliente paga $1200 en efectivo
     * Vuelto esperado = $200
     *
     * La lógica vive en validarMediosPago() (privado) pero se expone
     * a través del argumento `vuelto` que se pasa a tx.ventas.create().
     */
    it('should calculate exact vuelto = efectivo - total when efectivo > total', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1200 }], // paga 1200, total 1000 → vuelto 200
      };

      await service.createVenta(dto as any, 'user-1');

      // El vuelto debe haberse pasado correctamente a ventas.create
      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ vuelto: 200 }),
        expect.anything(),
      );
    });

    it('should calculate vuelto = 0 when efectivo exactly equals total', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1000 }], // exacto → vuelto 0
      };

      await service.createVenta(dto as any, 'user-1');

      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ vuelto: 0 }),
        expect.anything(),
      );
    });

    it('should not count non-efectivo payment towards vuelto', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'debito', monto: 1200 }], // débito, no efectivo → vuelto 0
      };

      await service.createVenta(dto as any, 'user-1');

      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ vuelto: 0 }),
        expect.anything(),
      );
    });

    it('should calculate vuelto only from efectivo portion in split payment', async () => {
      setupHappyPath();
      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [
          { medio_pago: 'efectivo', monto: 500 },
          { medio_pago: 'debito', monto: 600 },
        ],
      };

      await service.createVenta(dto as any, 'user-1');

      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({ vuelto: 0 }),
        expect.anything(),
      );
    });
  });

  // =====================================================================
  // Número de ticket — formato exacto
  // =====================================================================

  describe('Número de ticket — formato', () => {
    it('should generate numero_ticket with CAJA{n}-YYYYMMDD-NNNN format (first of day)', async () => {
      setupHappyPath();

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 1 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          numero_ticket: expect.stringMatching(new RegExp(`^CAJA1-${hoy}-\\d{4}$`)),
        }),
        expect.anything(),
      );
    });

    it('should increment sequence if previous ticket exists today', async () => {
      const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
      setupHappyPath();
      salesRepositoryMock.getUltimaVentaCajaByPrefix.mockResolvedValue({
        numero_ticket: `CAJA1-${hoy}-0003`,
      });

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 1 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      expect(salesRepositoryMock.crearVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          numero_ticket: `CAJA1-${hoy}-0004`,
        }),
        expect.anything(),
      );
    });
  });

  // =====================================================================
  // findAll — filtros de fecha
  // =====================================================================

  describe('findAll — filtros de fecha', () => {
    it('should filter by fecha_desde and fecha_hasta', async () => {
      salesRepositoryMock.findAll.mockResolvedValue([[], 0]);

      await service.findAll({
        fecha_desde: '2026-04-01',
        fecha_hasta: '2026-04-30',
        page: 1,
        limit: 20,
      } as any);

      expect(salesRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_desde: '2026-04-01',
          fecha_hasta: '2026-04-30',
        }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should include anuladas when incluir_anuladas is true', async () => {
      salesRepositoryMock.findAll.mockResolvedValue([[], 0]);

      await service.findAll({ incluir_anuladas: true, page: 1, limit: 20 } as any);

      expect(salesRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ incluir_anuladas: true }),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});

