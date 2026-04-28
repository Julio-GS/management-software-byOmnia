import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '@nestjs/cqrs';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventBus, useValue: eventBusMock },
        { provide: PromotionCalculatorService, useValue: promoCalcMock },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =====================================================================
  // createVenta — Happy Path
  // =====================================================================

  describe('createVenta', () => {
    function setupHappyPath(productoOverrides = {}) {
      const producto = { ...defaultProducto, ...productoOverrides };
      const tx = makeTx({ productos: { findMany: jest.fn().mockResolvedValue([producto]) } });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );
      return tx;
    }

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
      const tx = setupHappyPath();
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
      expect(tx.medios_pago_venta.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ medio_pago: 'efectivo' }),
            expect.objectContaining({ medio_pago: 'debito' }),
          ]),
        }),
      );
    });
  });

  // =====================================================================
  // Validaciones de negocio
  // =====================================================================

  describe('validaciones de negocio', () => {
    it('should throw BusinessException if caja is inactive', async () => {
      const tx = makeTx({ cajas: { findUnique: jest.fn().mockResolvedValue({ id: 'caja-1', numero: 1, activo: false }) } });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

      await expect(
        service.createVenta({ caja_id: 'caja-1', items: [], medios_pago: [] } as any, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException if precio_manual missing for F/V/P/C product', async () => {
      const tx = makeTx({
        productos: { findMany: jest.fn().mockResolvedValue([{ ...defaultProducto, requiere_precio_manual: true }]) },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

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
      const tx = makeTx({
        productos: { findMany: jest.fn().mockResolvedValue([{ ...defaultProducto, requiere_precio_manual: true }]) },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

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
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
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
      const tx = makeTx({
        productos: { findMany: jest.fn().mockResolvedValue([]) },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

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
      const tx = makeTx({
        productos: {
          findMany: jest.fn().mockResolvedValue([
            { ...defaultProducto, maneja_lotes: true, maneja_stock: true },
          ]),
        },
        lotes: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'lote-1', cantidad_actual: 3, fecha_vencimiento: new Date('2027-01-01'), activo: true, producto_id: 'prod-1' },
          ]),
        },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

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

      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([
          { producto_id: 'prod-1', cantidad: 5, precio_unitario: 500 },
          { producto_id: 'prod-1', cantidad: 20, precio_unitario: 500 },
        ]),
      );

      const tx = makeTx({
        productos: {
          findMany: jest.fn().mockResolvedValue([
            { ...defaultProducto, maneja_lotes: true, maneja_stock: true },
          ]),
        },
        lotes: { findMany: jest.fn().mockResolvedValue([lote1, lote2]) },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 25 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 12500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      // Verifica que se llamó con 2 items (uno por lote)
      expect(tx.detalle_ventas.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ lote_id: 'lote-1', cantidad: 5 }),
            expect.objectContaining({ lote_id: 'lote-2', cantidad: 20 }),
          ]),
        }),
      );
    });
  });

  // =====================================================================
  // anularVenta
  // =====================================================================

  describe('anularVenta', () => {
    it('should mark venta as anulada', async () => {
      prismaMock.ventas.findUnique.mockResolvedValue({ ...defaultVenta, anulada: false });
      prismaMock.ventas.update.mockResolvedValue({ ...defaultVenta, anulada: true, motivo_anulacion: 'Error de precio', fecha_anulacion: new Date() });

      const result = await service.anularVenta('venta-1', { motivo_anulacion: 'Error de precio' }, 'user-1');

      expect(result.anulada).toBe(true);
      expect(prismaMock.ventas.update).toHaveBeenCalledWith({
        where: { id: 'venta-1' },
        data: expect.objectContaining({ anulada: true, motivo_anulacion: 'Error de precio' }),
      });
    });

    it('should throw NotFoundException if venta not found', async () => {
      prismaMock.ventas.findUnique.mockResolvedValue(null);
      await expect(service.anularVenta('bad-id', { motivo_anulacion: 'motivo largo test' }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BusinessException if venta already anulada', async () => {
      prismaMock.ventas.findUnique.mockResolvedValue({ ...defaultVenta, anulada: true });
      await expect(service.anularVenta('venta-1', { motivo_anulacion: 'motivo largo test' }, 'user-1')).rejects.toThrow(BusinessException);
    });
  });

  // =====================================================================
  // findAll
  // =====================================================================

  describe('findAll', () => {
    it('should return paginated results', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([defaultVenta]);
      prismaMock.ventas.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by caja_id when provided', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([]);
      prismaMock.ventas.count.mockResolvedValue(0);

      await service.findAll({ caja_id: 'caja-1', page: 1, limit: 20 } as any);

      expect(prismaMock.ventas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ caja_id: 'caja-1' }),
        }),
      );
    });

    it('should exclude anuladas by default', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([]);
      prismaMock.ventas.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 } as any);

      expect(prismaMock.ventas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ anulada: false }),
        }),
      );
    });
  });

  // =====================================================================
  // findOne
  // =====================================================================

  describe('findOne', () => {
    it('should return venta with full detail', async () => {
      prismaMock.ventas.findUnique.mockResolvedValue(defaultVenta);
      const result = await service.findOne('venta-1');
      expect(result).toEqual(defaultVenta);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.ventas.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // =====================================================================
  // findByCajaHoy
  // =====================================================================

  describe('findByCajaHoy', () => {
    it('should return ventas for caja today only', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([defaultVenta]);

      const result = await service.findByCajaHoy('caja-1');

      expect(result).toHaveLength(1);
      expect(prismaMock.ventas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caja_id: 'caja-1',
            anulada: false,
          }),
        }),
      );
    });

    it('should only include ventas within today date range', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([]);

      await service.findByCajaHoy('caja-1');

      const call = prismaMock.ventas.findMany.mock.calls[0][0];
      expect(call.where.fecha.gte).toBeInstanceOf(Date);
      expect(call.where.fecha.lt).toBeInstanceOf(Date);
      // fecha.gte debe ser hoy a las 00:00:00
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      expect(call.where.fecha.gte.toDateString()).toBe(hoy.toDateString());
    });
  });

  // =====================================================================
  // findByNumeroTicket
  // =====================================================================

  describe('findByNumeroTicket', () => {
    it('should return venta by numero_ticket', async () => {
      prismaMock.ventas.findFirst.mockResolvedValue(defaultVenta);

      const result = await service.findByNumeroTicket('CAJA1-20260420-0001');

      expect(result).toEqual(defaultVenta);
      expect(prismaMock.ventas.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { numero_ticket: 'CAJA1-20260420-0001' },
        }),
      );
    });

    it('should throw NotFoundException if ticket not found', async () => {
      prismaMock.ventas.findFirst.mockResolvedValue(null);
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
      // total del carrito será 2 x $500 = $1000
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1200 }], // paga 1200, total 1000 → vuelto 200
      };

      await service.createVenta(dto as any, 'user-1');

      // El vuelto debe haberse pasado correctamente a ventas.create
      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vuelto: 200 }),
        }),
      );
    });

    it('should calculate vuelto = 0 when efectivo exactly equals total', async () => {
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1000 }], // exacto → vuelto 0
      };

      await service.createVenta(dto as any, 'user-1');

      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vuelto: 0 }),
        }),
      );
    });

    it('should not count non-efectivo payment towards vuelto', async () => {
      // total = 1000, paga con tarjeta 1200 → vuelto = 0 (no se devuelve en tarjeta)
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'debito', monto: 1200 }], // débito, no efectivo → vuelto 0
      };

      await service.createVenta(dto as any, 'user-1');

      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vuelto: 0 }),
        }),
      );
    });

    it('should calculate vuelto only from efectivo portion in split payment', async () => {
      // total = 1000
      // efectivo = 800, debito = 300 → total recibido = 1100
      // vuelto = efectivo (800) - total (1000) = negativo → 0
      // PERO: total = 1000, efectivo = 800 insuficiente sin tarjeta.
      // Caso válido: efectivo = 1200, debito = 0, total = 1000 → vuelto = 200
      // Caso split: efectivo = 500, debito = 600, total = 1000
      //   → efectivo (500) < total → vuelto = 0
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 2, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [
          { medio_pago: 'efectivo', monto: 500 },
          { medio_pago: 'debito', monto: 600 },
        ],
      };

      await service.createVenta(dto as any, 'user-1');

      // efectivo = 500 < total = 1000 → Math.max(0, 500-1000) = 0
      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vuelto: 0 }),
        }),
      );
    });
  });

  // =====================================================================
  // Número de ticket — formato exacto
  // =====================================================================

  describe('Número de ticket — formato', () => {
    it('should generate numero_ticket with CAJA{n}-YYYYMMDD-NNNN format (first of day)', async () => {
      const tx = makeTx();
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 1, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 1 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero_ticket: expect.stringMatching(new RegExp(`^CAJA1-${hoy}-\\d{4}$`)),
          }),
        }),
      );
    });

    it('should increment sequence if previous ticket exists today', async () => {
      const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const tx = makeTx({
        ventas: {
          findFirst: jest.fn().mockResolvedValue({
            numero_ticket: `CAJA1-${hoy}-0003`,
          }),
          create: jest.fn().mockResolvedValue(defaultVenta),
          findUnique: jest.fn().mockResolvedValue(defaultVenta),
        },
      });
      prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
      promoCalcMock.aplicarPromocionesAutomaticas.mockResolvedValue(
        carritoPlano([{ producto_id: 'prod-1', cantidad: 1, precio_unitario: 500 }]),
      );

      const dto = {
        caja_id: 'caja-1',
        items: [{ producto_id: 'prod-1', cantidad: 1 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 500 }],
      };

      await service.createVenta(dto as any, 'user-1');

      expect(tx.ventas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero_ticket: `CAJA1-${hoy}-0004`,
          }),
        }),
      );
    });
  });

  // =====================================================================
  // findAll — filtros de fecha
  // =====================================================================

  describe('findAll — filtros de fecha', () => {
    it('should filter by fecha_desde and fecha_hasta', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([]);
      prismaMock.ventas.count.mockResolvedValue(0);

      await service.findAll({
        fecha_desde: '2026-04-01',
        fecha_hasta: '2026-04-30',
        page: 1,
        limit: 20,
      } as any);

      const call = prismaMock.ventas.findMany.mock.calls[0][0];
      expect(call.where.fecha.gte).toEqual(new Date('2026-04-01'));
      expect(call.where.fecha.lte).toEqual(new Date('2026-04-30'));
    });

    it('should include anuladas when incluir_anuladas is true', async () => {
      prismaMock.ventas.findMany.mockResolvedValue([]);
      prismaMock.ventas.count.mockResolvedValue(0);

      await service.findAll({ incluir_anuladas: true, page: 1, limit: 20 } as any);

      const call = prismaMock.ventas.findMany.mock.calls[0][0];
      // anulada: undefined (no filtro) cuando incluir_anuladas = true
      expect(call.where.anulada).toBeUndefined();
    });
  });
});

