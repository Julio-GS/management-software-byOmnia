import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ProcesarDevolucionHandler } from './procesar-devolucion.handler';
import { ProcesarDevolucionCommand } from '../commands/procesar-devolucion.command';
import { DevolucionValidator } from '../validators/devolucion.validator';
import { RefundCalculatorService } from '../services/refund-calculator.service';
import { DevolucionesRepository } from '../repositories/devoluciones.repository';
import { PrismaService } from '../../database/prisma.service';
import { BusinessException } from '../../shared/exceptions/business.exception';
import { TechnicalException } from '../../shared/exceptions/technical.exception';
import { DevolucionCreatedEvent } from '../../shared/events/devolucion-created.event';

describe('ProcesarDevolucionHandler', () => {
  let handler: ProcesarDevolucionHandler;
  let validator: jest.Mocked<DevolucionValidator>;
  let refundCalculator: jest.Mocked<RefundCalculatorService>;
  let repository: jest.Mocked<DevolucionesRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let eventBus: jest.Mocked<EventBus>;

  const mockPrismaTransaction = {
    devoluciones: { create: jest.fn() },
    movimientos_stock: { create: jest.fn() },
    detalle_ventas: { findFirst: jest.fn() },
    lotes: { update: jest.fn() },
  };

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

  describe('execute', () => {
    const command = new ProcesarDevolucionCommand(
      '123e4567-e89b-12d3-a456-426614174000', // venta_id (UUID)
      '123e4567-e89b-12d3-a456-426614174001', // producto_id (UUID)
      5, // cantidad
      'Producto defectuoso', // motivo
    );

    const mockDetalleVenta = {
      id: 'dv-1',
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      producto_id: '123e4567-e89b-12d3-a456-426614174001',
      lote_id: 'lote-123',
      cantidad: 10,
      precio_unitario: 30.1,
      subtotal: 301,
      descuento: 0,
      total: 301,
    };

    const mockDevolucion = {
      id: 'dev-1',
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      producto_id: '123e4567-e89b-12d3-a456-426614174001',
      lote_id: 'lote-123',
      cantidad: 5,
      monto_devuelto: 150.5,
      tipo_devolucion: 'EFECTIVO',
      medio_devolucion: 'EFECTIVO',
      motivo: 'Producto defectuoso',
      fecha: new Date(),
      usuario_id: 'user-1',
    };

    it('should process devolucion successfully with all steps', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrismaTransaction);
      });

      repository.create.mockResolvedValue(mockDevolucion as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(validator.validateAll).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        5,
      );
      expect(refundCalculator.calcularMontoDevuelto).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        5,
      );
      expect(prisma.detalle_ventas.findFirst).toHaveBeenCalledWith({
        where: { venta_id: '123e4567-e89b-12d3-a456-426614174000', producto_id: '123e4567-e89b-12d3-a456-426614174001' },
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cantidad: 5,
          monto_devuelto: 150.5,
          motivo: 'Producto defectuoso',
        }),
        mockPrismaTransaction,
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(DevolucionCreatedEvent),
      );
      expect(result).toEqual(mockDevolucion);
    });

    it('should fail validation and not process devolucion', async () => {
      // Arrange
      validator.validateAll.mockRejectedValue(
        new BusinessException('Cantidad excede lo disponible', 'BAD_REQUEST'),
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BusinessException);
      expect(validator.validateAll).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        5,
      );
      expect(refundCalculator.calcularMontoDevuelto).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw TechnicalException when detalle_venta not found', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(TechnicalException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Detalle de venta no encontrado',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should create MovimientoInventario with tipo DEVOLUCION', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);

      const mockTransaction = {
        ...mockPrismaTransaction,
        movimientos_lotes: {
          create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      repository.create.mockResolvedValue(mockDevolucion as any);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockTransaction.movimientos_stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo_movimiento: 'DEVOLUCION',
          producto_id: '123e4567-e89b-12d3-a456-426614174001',
          lote_id: 'lote-123',
          cantidad: 5,
        }),
      });
    });

    it('should update inventario stock with cantidad devuelta', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);

      const mockTransaction = {
        ...mockPrismaTransaction,
        lotes: {
          update: jest.fn().mockResolvedValue({ cantidad_actual: 15 }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTransaction);
      });

      repository.create.mockResolvedValue(mockDevolucion as any);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockTransaction.lotes.update).toHaveBeenCalledWith({
        where: { id: 'lote-123' },
        data: { cantidad_actual: { increment: 5 } },
      });
    });

    it('should emit DevolucionCreatedEvent with correct data', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrismaTransaction);
      });

      repository.create.mockResolvedValue(mockDevolucion as any);

      // Act
      await handler.execute(command);

      // Assert
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          devolucionId: 'dev-1',
          cantidad: 5,
          montoDevuelto: 150.5,
        }),
      );
    });

    it('should handle decimal cantidad values correctly', async () => {
      // Arrange
      const decimalCommand = new ProcesarDevolucionCommand(
        '1',
        '100',
        2.5, // decimal cantidad
        'Peso incorrecto'
      );

      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(75.25);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrismaTransaction);
      });

      repository.create.mockResolvedValue({
        ...mockDevolucion,
        cantidad: 2.5,
        monto_devuelto: 75.25,
      } as any);

      // Act
      const result = await handler.execute(decimalCommand);

      // Assert
      expect(result.cantidad).toBe(2.5);
      expect(result.monto_devuelto).toBe(75.25);
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(mockDetalleVenta as any);

      prisma.$transaction.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should use lote_id from detalle_venta for trazabilidad', async () => {
      // Arrange
      const detalleConLote = { ...mockDetalleVenta, lote_id: 'lote-specific-999' };
      
      validator.validateAll.mockResolvedValue(undefined);
      refundCalculator.calcularMontoDevuelto.mockResolvedValue(150.5);
      (prisma.detalle_ventas.findFirst as jest.Mock).mockResolvedValue(detalleConLote as any);

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrismaTransaction);
      });

      repository.create.mockResolvedValue({
        ...mockDevolucion,
        lote_id: 'lote-specific-999',
      } as any);

      // Act
      await handler.execute(command);

      // Assert - Verifica que se use el lote_id correcto
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lote_id: 'lote-specific-999',
        }),
        mockPrismaTransaction,
      );
    });
  });
});
