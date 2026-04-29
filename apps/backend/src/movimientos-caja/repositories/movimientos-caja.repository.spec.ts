import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosCajaRepository } from './movimientos-caja.repository';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovimientoCajaDto } from '../dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from '../dto/filter-movimientos-caja.dto';

describe('MovimientosCajaRepository', () => {
  let repository: MovimientosCajaRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    movimientos_caja: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosCajaRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<MovimientosCajaRepository>(
      MovimientosCajaRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated movimientos with no filters', async () => {
      const filters: FilterMovimientosCajaDto = { page: 1, limit: 20 };
      const mockMovimientos = [
        {
          id: '1',
          tipo: 'gasto',
          monto: 500,
          concepto: 'Pago de luz',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date('2026-04-20'),
          usuarios: { username: 'admin' },
        },
      ];

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue(
        mockMovimientos,
      );
      mockPrismaService.movimientos_caja.count.mockResolvedValue(1);

      const result = await repository.findAll(filters);

      expect(result).toEqual({ data: mockMovimientos, total: 1 });
      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith({
        where: { tipo: undefined, fecha: { gte: undefined, lte: undefined } },
        skip: 0,
        take: 20,
        orderBy: { fecha: 'desc' },
        include: { usuarios: { select: { username: true } } },
      });
      expect(prismaService.movimientos_caja.count).toHaveBeenCalledWith({
        where: { tipo: undefined, fecha: { gte: undefined, lte: undefined } },
      });
    });

    it('should filter by tipo', async () => {
      const filters: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        tipo: 'gasto',
      };
      const mockMovimientos = [
        {
          id: '1',
          tipo: 'gasto',
          monto: 500,
          concepto: 'Luz',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date(),
          usuarios: { username: 'admin' },
        },
      ];

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue(
        mockMovimientos,
      );
      mockPrismaService.movimientos_caja.count.mockResolvedValue(1);

      const result = await repository.findAll(filters);

      expect(result.data).toEqual(mockMovimientos);
      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo: 'gasto' }),
        }),
      );
    });

    it('should filter by fecha_desde', async () => {
      const fechaDesde = '2026-04-20T00:00:00.000Z';
      const filters: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        fecha_desde: fechaDesde,
      };

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);
      mockPrismaService.movimientos_caja.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: expect.objectContaining({
              gte: new Date(fechaDesde),
            }),
          }),
        }),
      );
    });

    it('should filter by fecha_hasta', async () => {
      const fechaHasta = '2026-04-23T23:59:59.999Z';
      const filters: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        fecha_hasta: fechaHasta,
      };

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);
      mockPrismaService.movimientos_caja.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: expect.objectContaining({
              lte: new Date(fechaHasta),
            }),
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const fechaDesde = '2026-04-01T00:00:00.000Z';
      const fechaHasta = '2026-04-30T23:59:59.999Z';
      const filters: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      };

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);
      mockPrismaService.movimientos_caja.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: {
              gte: new Date(fechaDesde),
              lte: new Date(fechaHasta),
            },
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      const filters: FilterMovimientosCajaDto = { page: 3, limit: 10 };

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);
      mockPrismaService.movimientos_caja.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should combine all filters', async () => {
      const filters: FilterMovimientosCajaDto = {
        page: 2,
        limit: 50,
        tipo: 'retiro',
        fecha_desde: '2026-04-01T00:00:00.000Z',
        fecha_hasta: '2026-04-30T23:59:59.999Z',
      };

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);
      mockPrismaService.movimientos_caja.count.mockResolvedValue(0);

      await repository.findAll(filters);

      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tipo: 'retiro',
            fecha: {
              gte: new Date(filters.fecha_desde),
              lte: new Date(filters.fecha_hasta),
            },
          },
          skip: 50,
          take: 50,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return movimiento by id with user info', async () => {
      const mockMovimiento = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        usuario_id: 'user-1',
        observaciones: 'Pago mensual',
        fecha: new Date('2026-04-20'),
        usuarios: { username: 'admin' },
      };

      mockPrismaService.movimientos_caja.findUnique.mockResolvedValue(
        mockMovimiento,
      );

      const result = await repository.findById('1');

      expect(result).toEqual(mockMovimiento);
      expect(prismaService.movimientos_caja.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { usuarios: { select: { username: true } } },
      });
    });

    it('should return null if movimiento not found', async () => {
      mockPrismaService.movimientos_caja.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByFecha', () => {
    it('should return movimientos within date range', async () => {
      const desde = new Date('2026-04-20T00:00:00.000Z');
      const hasta = new Date('2026-04-20T23:59:59.999Z');
      const mockMovimientos = [
        {
          id: '1',
          tipo: 'gasto',
          monto: 500,
          concepto: 'Luz',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date('2026-04-20T10:00:00.000Z'),
        },
        {
          id: '2',
          tipo: 'retiro',
          monto: 1000,
          concepto: 'Retiro caja',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date('2026-04-20T15:00:00.000Z'),
        },
      ];

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue(
        mockMovimientos,
      );

      const result = await repository.findByFecha(desde, hasta);

      expect(result).toEqual(mockMovimientos);
      expect(prismaService.movimientos_caja.findMany).toHaveBeenCalledWith({
        where: { fecha: { gte: desde, lte: hasta } },
        orderBy: { fecha: 'asc' },
      });
    });

    it('should return empty array if no movimientos in range', async () => {
      const desde = new Date('2026-04-20T00:00:00.000Z');
      const hasta = new Date('2026-04-20T23:59:59.999Z');

      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);

      const result = await repository.findByFecha(desde, hasta);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create movimiento gasto', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        observaciones: 'Pago mensual',
      };
      const userId = 'user-1';
      const mockCreated = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        usuario_id: 'user-1',
        observaciones: 'Pago mensual',
        fecha: new Date(),
      };

      mockPrismaService.movimientos_caja.create.mockResolvedValue(mockCreated);

      const result = await repository.create(dto, userId);

      expect(result).toEqual(mockCreated);
      expect(prismaService.movimientos_caja.create).toHaveBeenCalledWith({
        data: {
          tipo: dto.tipo,
          monto: dto.monto,
          concepto: dto.concepto,
          comprobante: dto.comprobante,
          observaciones: dto.observaciones,
          usuario_id: userId,
        },
      });
    });

    it('should create movimiento retiro', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
      };
      const userId = 'user-2';
      const mockCreated = {
        id: '2',
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
        comprobante: null,
        usuario_id: 'user-2',
        observaciones: null,
        fecha: new Date(),
      };

      mockPrismaService.movimientos_caja.create.mockResolvedValue(mockCreated);

      const result = await repository.create(dto, userId);

      expect(result).toEqual(mockCreated);
      expect(prismaService.movimientos_caja.create).toHaveBeenCalledWith({
        data: {
          tipo: dto.tipo,
          monto: dto.monto,
          concepto: dto.concepto,
          comprobante: undefined,
          observaciones: undefined,
          usuario_id: userId,
        },
      });
    });

    it('should handle optional fields', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 250.75,
        concepto: 'Compra insumos',
      };
      const userId = 'user-1';

      mockPrismaService.movimientos_caja.create.mockResolvedValue({
        id: '3',
        ...dto,
        comprobante: null,
        observaciones: null,
        usuario_id: userId,
        fecha: new Date(),
      });

      await repository.create(dto, userId);

      expect(prismaService.movimientos_caja.create).toHaveBeenCalledWith({
        data: {
          tipo: dto.tipo,
          monto: dto.monto,
          concepto: dto.concepto,
          comprobante: undefined,
          observaciones: undefined,
          usuario_id: userId,
        },
      });
    });
  });
});
