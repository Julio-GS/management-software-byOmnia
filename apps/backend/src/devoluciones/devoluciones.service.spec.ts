import { Test, TestingModule } from '@nestjs/testing';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesRepository } from './repositories/devoluciones.repository';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { BusinessException } from '../shared/exceptions/business.exception';
import { CreateDevolucionDto } from './dto';

describe('DevolucionesService', () => {
  let service: DevolucionesService;
  let repository: DevolucionesRepository;
  let prisma: PrismaService;
  let eventBus: EventBus;

  // Mock IDs
  const mockVentaId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductoId = '123e4567-e89b-12d3-a456-426614174001';
  const mockLoteId = '123e4567-e89b-12d3-a456-426614174002';
  const mockDevolucionId = '123e4567-e89b-12d3-a456-426614174003';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174004';

  const mockVenta = {
    id: mockVentaId,
    numero_ticket: 'SALE-20240115-0001',
    total: 1000,
    anulada: false,
    fecha: new Date('2024-01-15'),
  };

  const mockDetalleVenta = {
    venta_id: mockVentaId,
    producto_id: mockProductoId,
    lote_id: mockLoteId,
    cantidad: 10,
    precio_unitario: 100,
    subtotal: 1000,
    descuento: 100,
    total: 900, // 1000 - 100 discount
  };

  const mockDevolucion = {
    id: mockDevolucionId,
    venta_id: mockVentaId,
    producto_id: mockProductoId,
    lote_id: mockLoteId,
    cantidad: 5,
    monto_devuelto: 450,
    tipo_devolucion: 'efectivo',
    medio_devolucion: 'efectivo',
    usuario_id: mockUserId,
    motivo: 'Producto defectuoso',
    observaciones: null,
    fecha: new Date(),
    productos: {
      codigo: 'PROD001',
      detalle: 'Producto Test',
    },
    ventas: {
      numero_ticket: 'SALE-20240115-0001',
    },
    lotes: {
      numero_lote: 'LOTE001',
    },
  };

  const mockPrisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    ventas: {
      findUnique: jest.fn(),
    },
    detalle_ventas: {
      findFirst: jest.fn(),
    },
    devoluciones: {
      create: jest.fn(),
    },
    movimientos_stock: {
      create: jest.fn(),
    },
  };

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByVenta: jest.fn(),
    getTotalDevuelto: jest.fn(),
    create: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionesService,
        {
          provide: DevolucionesRepository,
          useValue: mockRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<DevolucionesService>(DevolucionesService);
    repository = module.get<DevolucionesRepository>(DevolucionesRepository);
    prisma = module.get<PrismaService>(PrismaService);
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCantidadDisponible', () => {
    it('should pass when cantidad is within disponible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 0,
          disponible: 10,
        },
      ]);

      await expect(
        service.validateCantidadDisponible(mockVentaId, mockProductoId, 5),
      ).resolves.not.toThrow();
    });

    it('should throw when cantidad exceeds disponible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 7,
          disponible: 3,
        },
      ]);

      await expect(
        service.validateCantidadDisponible(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when no detalle_venta found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.validateCantidadDisponible(mockVentaId, mockProductoId, 1),
      ).rejects.toThrow(BusinessException);
    });

    it('should handle multiple devoluciones parciales correctly', async () => {
      // First devolucion: 3 out of 10
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 3,
          disponible: 7,
        },
      ]);

      await expect(
        service.validateCantidadDisponible(mockVentaId, mockProductoId, 2),
      ).resolves.not.toThrow();

      // Second devolucion: trying to return 6 when only 7 available
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 5, // 3 + 2
          disponible: 5,
        },
      ]);

      await expect(
        service.validateCantidadDisponible(mockVentaId, mockProductoId, 6),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getLoteOriginal', () => {
    it('should return lote_id from detalle_venta', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue({
        lote_id: mockLoteId,
      });

      const result = await service.getLoteOriginal(mockVentaId, mockProductoId);

      expect(result).toBe(mockLoteId);
      expect(mockPrisma.detalle_ventas.findFirst).toHaveBeenCalledWith({
        where: { venta_id: mockVentaId, producto_id: mockProductoId },
        select: { lote_id: true },
      });
    });

    it('should return null when no lote_id exists', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue({
        lote_id: null,
      });

      const result = await service.getLoteOriginal(mockVentaId, mockProductoId);

      expect(result).toBeNull();
    });

    it('should return null when detalle_venta not found', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(null);

      const result = await service.getLoteOriginal(mockVentaId, mockProductoId);

      expect(result).toBeNull();
    });
  });

  describe('calcularMontoDevuelto', () => {
    it('should calculate monto with discount applied', async () => {
      // total = 900 (1000 - 100 discount), cantidad = 10
      // precio con descuento = 900 / 10 = 90 per unit
      // devolver 5 unidades = 90 * 5 = 450
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(mockDetalleVenta);

      const result = await service.calcularMontoDevuelto(
        mockVentaId,
        mockProductoId,
        5,
      );

      expect(result).toBe(450);
    });

    it('should calculate monto without discount', async () => {
      // total = 1000, cantidad = 10, no discount
      // precio = 1000 / 10 = 100 per unit
      // devolver 5 = 100 * 5 = 500
      const detalleWithoutDiscount = {
        ...mockDetalleVenta,
        descuento: 0,
        total: 1000,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleWithoutDiscount);

      const result = await service.calcularMontoDevuelto(
        mockVentaId,
        mockProductoId,
        5,
      );

      expect(result).toBe(500);
    });

    it('should throw when detalle_venta not found', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(null);

      await expect(
        service.calcularMontoDevuelto(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle decimal quantities correctly', async () => {
      // total = 900, cantidad = 10
      // precio = 90
      // devolver 2.5 = 90 * 2.5 = 225
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(mockDetalleVenta);

      const result = await service.calcularMontoDevuelto(
        mockVentaId,
        mockProductoId,
        2.5,
      );

      expect(result).toBe(225);
    });
  });

  describe('createDevolucion', () => {
    const createDto: CreateDevolucionDto = {
      venta_id: mockVentaId,
      producto_id: mockProductoId,
      cantidad: 5,
      tipo_devolucion: 'efectivo',
      medio_devolucion: 'efectivo',
      motivo: 'Producto defectuoso',
    };

    it('should create devolucion with full transaction flow', async () => {
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(mockVenta),
        },
        detalle_ventas: {
          findFirst: jest.fn().mockResolvedValue(mockDetalleVenta),
        },
        devoluciones: {
          create: jest.fn().mockResolvedValue(mockDevolucion),
        },
        movimientos_stock: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      mockPrisma.$queryRaw.mockResolvedValue([
        { disponible: 10 },
      ]);

      mockRepository.findById.mockResolvedValue(mockDevolucion);

      const result = await service.createDevolucion(createDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.devolucion.id).toBe(mockDevolucionId);
      expect(mockTx.devoluciones.create).toHaveBeenCalled();
      expect(mockTx.movimientos_stock.create).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw when venta not found', async () => {
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.createDevolucion(createDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when venta is anulada', async () => {
      const ventaAnulada = { ...mockVenta, anulada: true };
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(ventaAnulada),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.createDevolucion(createDto, mockUserId),
      ).rejects.toThrow(BusinessException);
    });

    it('should return product to same lote', async () => {
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(mockVenta),
        },
        detalle_ventas: {
          findFirst: jest.fn().mockResolvedValue(mockDetalleVenta),
        },
        devoluciones: {
          create: jest.fn().mockResolvedValue(mockDevolucion),
        },
        movimientos_stock: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ disponible: 10 }]);
      mockRepository.findById.mockResolvedValue(mockDevolucion);

      await service.createDevolucion(createDto, mockUserId);

      const createCall = mockTx.devoluciones.create.mock.calls[0][0];
      expect(createCall.data.lote_id).toBe(mockLoteId);
    });

    it('should create movimiento_stock with tipo devolucion', async () => {
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(mockVenta),
        },
        detalle_ventas: {
          findFirst: jest.fn().mockResolvedValue(mockDetalleVenta),
        },
        devoluciones: {
          create: jest.fn().mockResolvedValue(mockDevolucion),
        },
        movimientos_stock: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ disponible: 10 }]);
      mockRepository.findById.mockResolvedValue(mockDevolucion);

      await service.createDevolucion(createDto, mockUserId);

      expect(mockTx.movimientos_stock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo_movimiento: 'devolucion',
          cantidad: 5,
          producto_id: mockProductoId,
          lote_id: mockLoteId,
          venta_id: mockVentaId,
          usuario_id: mockUserId,
        }),
      });
    });

    it('should emit DevolucionCreatedEvent', async () => {
      const mockTx = {
        ventas: {
          findUnique: jest.fn().mockResolvedValue(mockVenta),
        },
        detalle_ventas: {
          findFirst: jest.fn().mockResolvedValue(mockDetalleVenta),
        },
        devoluciones: {
          create: jest.fn().mockResolvedValue(mockDevolucion),
        },
        movimientos_stock: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ disponible: 10 }]);
      mockRepository.findById.mockResolvedValue(mockDevolucion);

      await service.createDevolucion(createDto, mockUserId);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          devolucionId: mockDevolucionId,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should delegate to repository', async () => {
      const filters = { page: 1, limit: 20 };
      const mockResult = { data: [mockDevolucion], total: 1 };
      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockResult);
      expect(mockRepository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return devolucion when found', async () => {
      mockRepository.findById.mockResolvedValue(mockDevolucion);

      const result = await service.findOne(mockDevolucionId);

      expect(result).toEqual(mockDevolucion);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByVenta', () => {
    it('should return all devoluciones for venta', async () => {
      const mockDevoluciones = [mockDevolucion];
      mockRepository.findByVenta.mockResolvedValue(mockDevoluciones);

      const result = await service.findByVenta(mockVentaId);

      expect(result).toEqual(mockDevoluciones);
      expect(mockRepository.findByVenta).toHaveBeenCalledWith(mockVentaId);
    });
  });
});
