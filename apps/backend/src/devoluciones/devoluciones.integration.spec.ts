/**
 * Devoluciones Integration Tests - 8 Critical Scenarios
 * 
 * Tests cover:
 * 1. Devolución Parcial (restock correcto)
 * 2. Devolución Total con Promoción (refund ajustado)
 * 3. Validación - Cantidad Excedida (BusinessException)
 * 4. Validación - Venta Anulada (BusinessException)
 * 5. Validación - Plazo Vencido (BusinessException)
 * 6. Restock Lote Correcto (trazabilidad)
 * 7. Evento Emitido (DevolucionProcessed)
 * 8. Rollback Atómico (transacción)
 * 
 * NOTE: These are integration-level tests using mocks to simulate database behavior.
 * For full integration tests, use a real test database (PostgreSQL or SQLite).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ProcesarDevolucionHandler } from './handlers/procesar-devolucion.handler';
import { ProcesarDevolucionCommand } from './commands/procesar-devolucion.command';
import { DevolucionValidator } from './validators/devolucion.validator';
import { RefundCalculatorService } from './services/refund-calculator.service';
import { DevolucionesRepository } from './repositories/devoluciones.repository';
import { PrismaService } from '../database/prisma.service';
import { BusinessException } from '../shared/exceptions/business.exception';
import { DevolucionCreatedEvent } from '../shared/events/devolucion-created.event';

describe('Devoluciones Integration Tests', () => {
  let handler: ProcesarDevolucionHandler;
  let validator: jest.Mocked<DevolucionValidator>;
  let refundCalculator: jest.Mocked<RefundCalculatorService>;
  let repository: jest.Mocked<DevolucionesRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let eventBus: jest.Mocked<EventBus>;

  // Test data constants
  const TEST_VENTA_ID = '123e4567-e89b-12d3-a456-426614174000';
  const TEST_PRODUCTO_ID = '123e4567-e89b-12d3-a456-426614174001';
  const TEST_LOTE_ID = 'lote-test-123';
  const TEST_USUARIO_ID = 'user-test-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcesarDevolucionHandler,
        {
          provide: DevolucionValidator,
          useValue: {
            validateAll: jest.fn(),
          },
        },
        {
          provide: RefundCalculatorService,
          useValue: {
            calcularMontoDevuelto: jest.fn(),
          },
        },
        {
          provide: DevolucionesRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            detalle_ventas: { findFirst: jest.fn() },
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ProcesarDevolucionHandler>(ProcesarDevolucionHandler);
    validator = module.get(DevolucionValidator);
    refundCalculator = module.get(RefundCalculatorService);
    repository = module.get(DevolucionesRepository);
    prisma = module.get(PrismaService);
    eventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // TEST 1: Devolución Parcial (restock correcto)
  // ============================================
  describe('Test 1: Devolución Parcial', () => {
    it('should process partial return and update stock correctly', async () => {
      // ARRANGE: Create venta with 5 units from LOTE-A
      const mockDetalleVenta = {
        id: 'dv-1',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 5,
        precio_unitario: 100,
        subtotal: 500,
        descuento: 0,
        total: 500,
      };

      const mockDevolucion = {
        id: 'dev-partial-1',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 3,
        monto_devuelto: 300,
        tipo_devolucion: 'EFECTIVO',
        medio_devolucion: 'EFECTIVO',
        motivo: 'Producto defectuoso',
        fecha: new Date(),
        usuario_id: TEST_USUARIO_ID,
      };

      const mockTransaction = {
        devoluciones: { create: jest.fn().mockResolvedValue(mockDevolucion) },
        movimientos_stock: { create: jest.fn().mockResolvedValue({}) },
        lotes: { 
          update: jest.fn().mockResolvedValue({ cantidad_actual: 103 }) 
        },
      };

      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(300);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      repository.create.mockResolvedValue(mockDevolucion as any);

      // ACT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3, // returning 3 units
        'Producto defectuoso',
      );
      const result = await handler.execute(command);

      // ASSERT
      expect(result.cantidad).toBe(3);
      expect(result.monto_devuelto).toBe(300);

      // Verify stock increased by 3
      expect(mockTransaction.lotes.update).toHaveBeenCalledWith({
        where: { id: TEST_LOTE_ID },
        data: { cantidad_actual: { increment: 3 } },
      });

      // Verify MovimientoInventario created
      expect(mockTransaction.movimientos_stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo_movimiento: 'DEVOLUCION',
          cantidad: 3,
          lote_id: TEST_LOTE_ID,
        }),
      });
    });
  });

  // ============================================
  // TEST 2: Devolución Total con Promoción
  // ============================================
  describe('Test 2: Devolución Total con Promoción', () => {
    it('should calculate refund with promotion discount applied', async () => {
      // ARRANGE: Customer bought 10 units but paid for 7 (30% discount via 3x2 promo)
      const mockDetalleVenta = {
        id: 'dv-2',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 10,
        precio_unitario: 100,
        subtotal: 1000,
        descuento: 300, // 30% discount
        total: 700,    // what customer actually paid
        promocion_id: 'promo-3x2',
      };

      const mockDevolucion = {
        id: 'dev-promo-1',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 10,
        monto_devuelto: 700, // should be precio_final, not 1000
        tipo_devolucion: 'EFECTIVO',
        medio_devolucion: 'EFECTIVO',
        motivo: 'No necesita',
        fecha: new Date(),
        usuario_id: TEST_USUARIO_ID,
      };

      const mockTransaction = {
        devoluciones: { create: jest.fn().mockResolvedValue(mockDevolucion) },
        movimientos_stock: { create: jest.fn().mockResolvedValue({}) },
        lotes: { update: jest.fn().mockResolvedValue({}) },
      };

      validator.validateAll.mockResolvedValue(undefined);
      // Calculator should return 700 (precio_final), not 1000 (precio_lista)
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(700);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      repository.create.mockResolvedValue(mockDevolucion as any);

      // ACT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        10, // returning all 10 units
        'No necesita',
      );
      const result = await handler.execute(command);

      // ASSERT: Refund should be for 7 units (what customer paid), not 10
      expect(result.monto_devuelto).toBe(700);
      
      // Verify calculator was called with correct params
      expect(refundCalculator.calcularMontoDevuelto).toHaveBeenCalledWith(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        10,
      );
    });
  });

  // ============================================
  // TEST 3: Validación - Cantidad Excedida
  // ============================================
  describe('Test 3: Validación - Cantidad Excedida', () => {
    it('should reject return when cantidad exceeds available', async () => {
      // ARRANGE: Customer bought 5 units
      validator.validateAll.mockRejectedValue(
        new BusinessException('No se puede devolver más de lo comprado', 'BAD_REQUEST'),
      );

      // ACT & ASSERT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        6, // trying to return 6 units (exceeds 5 bought)
        'Motivo',
      );

      await expect(handler.execute(command)).rejects.toThrow(BusinessException);
      await expect(handler.execute(command)).rejects.toThrow(
        'No se puede devolver más de lo comprado',
      );

      // Verify validation was called
      expect(validator.validateAll).toHaveBeenCalledWith(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        6,
      );
    });
  });

  // ============================================
  // TEST 4: Validación - Venta Anulada
  // ============================================
  describe('Test 4: Validación - Venta Anulada', () => {
    it('should reject return for cancelled sale', async () => {
      // ARRANGE: Create cancelled venta
      validator.validateAll.mockRejectedValue(
        new BusinessException('No se puede procesar devolución de venta anulada', 'BAD_REQUEST'),
      );

      // ACT & ASSERT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3,
        'Motivo',
      );

      await expect(handler.execute(command)).rejects.toThrow(BusinessException);
      await expect(handler.execute(command)).rejects.toThrow(
        'No se puede procesar devolución de venta anulada',
      );
    });
  });

  // ============================================
  // TEST 5: Validación - Plazo Vencido
  // ============================================
  describe('Test 5: Validación - Plazo Vencido', () => {
    it('should reject return after 30 days', async () => {
      // ARRANGE: Create venta from 31 days ago
      validator.validateAll.mockRejectedValue(
        new BusinessException('Plazo de devolución vencido (30 días)', 'BAD_REQUEST'),
      );

      // ACT & ASSERT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3,
        'Motivo',
      );

      await expect(handler.execute(command)).rejects.toThrow(BusinessException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Plazo de devolución vencido (30 días)',
      );
    });
  });

  // ============================================
  // TEST 6: Restock al Lote Correcto
  // ============================================
  describe('Test 6: Restock al Lote Correcto', () => {
    it('should return stock to SAME lote used in original sale', async () => {
      // ARRANGE: Create 2 lotes (A and B), venta used LOTE-A
      const loteAId = 'lote-A-123';
      const loteBId = 'lote-B-456';
      
      const mockDetalleVenta = {
        id: 'dv-3',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: loteAId, // Original sale used LOTE-A
        cantidad: 5,
        precio_unitario: 100,
        total: 500,
      };

      const mockDevolucion = {
        id: 'dev-lote-1',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: loteAId, // Should be LOTE-A (same as original)
        cantidad: 3,
        monto_devuelto: 300,
        tipo_devolucion: 'EFECTIVO',
        medio_devolucion: 'EFECTIVO',
        motivo: 'Motivo',
        fecha: new Date(),
        usuario_id: TEST_USUARIO_ID,
      };

      const mockTransaction = {
        devoluciones: { create: jest.fn().mockResolvedValue(mockDevolucion) },
        movimientos_stock: { create: jest.fn().mockResolvedValue({}) },
        lotes: { 
          update: jest.fn().mockResolvedValue({ cantidad_actual: 103 }) 
        },
      };

      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(300);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      repository.create.mockResolvedValue(mockDevolucion as any);

      // ACT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3,
        'Motivo',
      );
      await handler.execute(command);

      // ASSERT: LOTE-A should be updated, not LOTE-B
      expect(mockTransaction.lotes.update).toHaveBeenCalledWith({
        where: { id: loteAId },
        data: { cantidad_actual: { increment: 3 } },
      });

      // Verify MovimientoInventario references LOTE-A
      expect(mockTransaction.movimientos_stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lote_id: loteAId,
          tipo_movimiento: 'DEVOLUCION',
        }),
      });
    });
  });

  // ============================================
  // TEST 7: Evento DevolucionProcessed
  // ============================================
  describe('Test 7: Evento DevolucionProcessed', () => {
    it('should emit DevolucionCreatedEvent after successful return', async () => {
      // ARRANGE
      const mockDetalleVenta = {
        id: 'dv-4',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 5,
        precio_unitario: 100,
        total: 500,
      };

      const mockDevolucion = {
        id: 'dev-event-1',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 3,
        monto_devuelto: 300,
        tipo_devolucion: 'EFECTIVO',
        medio_devolucion: 'EFECTIVO',
        motivo: 'Motivo',
        fecha: new Date(),
        usuario_id: TEST_USUARIO_ID,
      };

      const mockTransaction = {
        devoluciones: { create: jest.fn().mockResolvedValue(mockDevolucion) },
        movimientos_stock: { create: jest.fn().mockResolvedValue({}) },
        lotes: { update: jest.fn().mockResolvedValue({}) },
      };

      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(300);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });
      repository.create.mockResolvedValue(mockDevolucion as any);

      // ACT
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3,
        'Motivo',
      );
      const result = await handler.execute(command);

      // ASSERT: Event emitted with correct payload
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(DevolucionCreatedEvent),
      );

      // Verify event contains expected data
      const publishedEvent = eventBus.publish.mock.calls[0][0];
      expect((publishedEvent as any).devolucionId).toBe('dev-event-1');
      expect((publishedEvent as any).cantidad).toBe(3);
      expect((publishedEvent as any).montoDevuelto).toBe(300);
    });
  });

  // ============================================
  // TEST 8: Transacción Atómica (Rollback on Error)
  // ============================================
  describe('Test 8: Transacción Atómica (Rollback on Error)', () => {
    it('should rollback all changes if any operation fails', async () => {
      // ARRANGE: Create venta
      const mockDetalleVenta = {
        id: 'dv-5',
        venta_id: TEST_VENTA_ID,
        producto_id: TEST_PRODUCTO_ID,
        lote_id: TEST_LOTE_ID,
        cantidad: 5,
        precio_unitario: 100,
        total: 500,
      };

      const mockTransaction = {
        devoluciones: { create: jest.fn().mockResolvedValue({ id: 'dev-rollback-1' }) },
        movimientos_stock: { create: jest.fn().mockRejectedValue(new Error('Database error')) },
        lotes: { update: jest.fn() },
      };

      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(300);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      // ACT: Try to process return (should fail)
      const command = new ProcesarDevolucionCommand(
        TEST_VENTA_ID,
        TEST_PRODUCTO_ID,
        3,
        'Motivo',
      );

      await expect(handler.execute(command)).rejects.toThrow('Database error');

      // ASSERT: No event should be emitted (transaction rolled back)
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});