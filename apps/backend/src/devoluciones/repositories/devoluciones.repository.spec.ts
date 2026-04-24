import { Test, TestingModule } from '@nestjs/testing';
import { DevolucionesRepository } from './devoluciones.repository';
import { PrismaService } from '../../database/prisma.service';
import { FilterDevolucionesDto } from '../dto';

describe('DevolucionesRepository', () => {
  let repository: DevolucionesRepository;
  let prisma: PrismaService;

  // Mock data
  const mockVentaId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductoId = '123e4567-e89b-12d3-a456-426614174001';
  const mockLoteId = '123e4567-e89b-12d3-a456-426614174002';
  const mockDevolucionId = '123e4567-e89b-12d3-a456-426614174003';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174004';

  const mockDevolucion = {
    id: mockDevolucionId,
    venta_id: mockVentaId,
    producto_id: mockProductoId,
    lote_id: mockLoteId,
    cantidad: 5,
    monto_devuelto: 450.50,
    tipo_devolucion: 'efectivo',
    medio_devolucion: 'efectivo',
    usuario_id: mockUserId,
    motivo: 'Producto defectuoso',
    observaciones: null,
    fecha: new Date('2024-01-15'),
  };

  const mockDevolucionWithRelations = {
    ...mockDevolucion,
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
    usuarios: {
      username: 'cajero1',
    },
  };

  const mockPrisma = {
    devoluciones: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionesRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<DevolucionesRepository>(DevolucionesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated devoluciones with default pagination', async () => {
      const filters: FilterDevolucionesDto = {};
      mockPrisma.devoluciones.findMany.mockResolvedValue([mockDevolucionWithRelations]);
      mockPrisma.devoluciones.count.mockResolvedValue(1);

      const result = await repository.findAll(filters);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { fecha: 'desc' },
        include: {
          productos: { select: { codigo: true, detalle: true } },
          ventas: { select: { numero_ticket: true } },
          usuarios: { select: { username: true } },
        },
      });
    });

    it('should apply venta_id filter', async () => {
      const filters: FilterDevolucionesDto = { venta_id: mockVentaId };
      mockPrisma.devoluciones.findMany.mockResolvedValue([mockDevolucionWithRelations]);
      mockPrisma.devoluciones.count.mockResolvedValue(1);

      await repository.findAll(filters);

      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { venta_id: mockVentaId },
        }),
      );
    });

    it('should apply producto_id filter', async () => {
      const filters: FilterDevolucionesDto = { producto_id: mockProductoId };
      mockPrisma.devoluciones.findMany.mockResolvedValue([]);
      mockPrisma.devoluciones.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { producto_id: mockProductoId },
        }),
      );
    });

    it('should apply date range filters', async () => {
      const filters: FilterDevolucionesDto = {
        fecha_desde: '2024-01-01',
        fecha_hasta: '2024-01-31',
      };
      mockPrisma.devoluciones.findMany.mockResolvedValue([]);
      mockPrisma.devoluciones.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            fecha: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          },
        }),
      );
    });

    it('should handle custom pagination', async () => {
      const filters: FilterDevolucionesDto = { page: 2, limit: 10 };
      mockPrisma.devoluciones.findMany.mockResolvedValue([]);
      mockPrisma.devoluciones.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return devolucion with all relations', async () => {
      mockPrisma.devoluciones.findUnique.mockResolvedValue(mockDevolucionWithRelations);

      const result = await repository.findById(mockDevolucionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockDevolucionId);
      expect(mockPrisma.devoluciones.findUnique).toHaveBeenCalledWith({
        where: { id: mockDevolucionId },
        include: {
          productos: true,
          ventas: true,
          lotes: { select: { numero_lote: true } },
          usuarios: { select: { username: true } },
        },
      });
    });

    it('should return null when devolucion not found', async () => {
      mockPrisma.devoluciones.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByVenta', () => {
    it('should return all devoluciones for a venta', async () => {
      const mockDevoluciones = [mockDevolucionWithRelations];
      mockPrisma.devoluciones.findMany.mockResolvedValue(mockDevoluciones);

      const result = await repository.findByVenta(mockVentaId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.devoluciones.findMany).toHaveBeenCalledWith({
        where: { venta_id: mockVentaId },
        orderBy: { fecha: 'desc' },
        include: {
          productos: { select: { codigo: true, detalle: true } },
        },
      });
    });

    it('should return empty array when no devoluciones found', async () => {
      mockPrisma.devoluciones.findMany.mockResolvedValue([]);

      const result = await repository.findByVenta(mockVentaId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTotalDevuelto', () => {
    it('should return sum of cantidad for producto in venta', async () => {
      mockPrisma.devoluciones.aggregate.mockResolvedValue({
        _sum: { cantidad: 7 },
      });

      const result = await repository.getTotalDevuelto(mockVentaId, mockProductoId);

      expect(result).toBe(7);
      expect(mockPrisma.devoluciones.aggregate).toHaveBeenCalledWith({
        where: { venta_id: mockVentaId, producto_id: mockProductoId },
        _sum: { cantidad: true },
      });
    });

    it('should return 0 when no devoluciones found', async () => {
      mockPrisma.devoluciones.aggregate.mockResolvedValue({
        _sum: { cantidad: null },
      });

      const result = await repository.getTotalDevuelto(mockVentaId, mockProductoId);

      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    it('should create devolucion within transaction', async () => {
      const createData = {
        venta_id: mockVentaId,
        producto_id: mockProductoId,
        lote_id: mockLoteId,
        cantidad: 5,
        monto_devuelto: 450.50,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        usuario_id: mockUserId,
        motivo: 'Producto defectuoso',
        observaciones: null,
      };

      const mockTx = {
        devoluciones: {
          create: jest.fn().mockResolvedValue(mockDevolucion),
        },
      };

      const result = await repository.create(createData, mockTx as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockDevolucionId);
      expect(mockTx.devoluciones.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should handle optional fields', async () => {
      const createData = {
        venta_id: mockVentaId,
        producto_id: mockProductoId,
        lote_id: null,
        cantidad: 3,
        monto_devuelto: 270.30,
        tipo_devolucion: 'nota_credito',
        medio_devolucion: 'nota_credito',
        usuario_id: mockUserId,
        motivo: 'Cliente arrepentido',
        observaciones: 'Devolución parcial',
      };

      const mockTx = {
        devoluciones: {
          create: jest.fn().mockResolvedValue({
            ...mockDevolucion,
            ...createData,
          }),
        },
      };

      const result = await repository.create(createData, mockTx as any);

      expect(result).toBeDefined();
      expect(result.observaciones).toBe('Devolución parcial');
      expect(result.lote_id).toBeNull();
    });
  });
});
