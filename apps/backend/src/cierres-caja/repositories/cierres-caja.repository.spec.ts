import { Test, TestingModule } from '@nestjs/testing';
import { CierresCajaRepository } from './cierres-caja.repository';
import { PrismaService } from '../../database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('CierresCajaRepository', () => {
  let repository: CierresCajaRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    cierres_caja: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CierresCajaRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<CierresCajaRepository>(CierresCajaRepository);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // ✅ findAll
  describe('findAll', () => {
    it('should return cierres with caja_id filter', async () => {
      const cajaId = '550e8400-e29b-41d4-a716-446655440000';
      const mockCierres = [
        {
          id: '1',
          caja_id: cajaId,
          fecha: new Date('2026-04-20'),
          total_ventas: new Decimal(5000),
          cajas: { numero: 1, nombre: 'Caja 1' },
        },
      ];

      mockPrismaService.cierres_caja.findMany.mockResolvedValue(mockCierres);

      const result = await repository.findAll({ caja_id: cajaId });

      expect(result).toEqual(mockCierres);
      expect(prisma.cierres_caja.findMany).toHaveBeenCalledWith({
        where: {
          caja_id: cajaId,
          fecha: {},
        },
        orderBy: { fecha: 'desc' },
        include: {
          cajas: { select: { numero: true, nombre: true } },
          usuarios: { select: { username: true } },
        },
      });
    });

    it('should return cierres with fecha filter', async () => {
      const fecha = '2026-04-20';
      mockPrismaService.cierres_caja.findMany.mockResolvedValue([]);

      await repository.findAll({ fecha });

      expect(prisma.cierres_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: new Date(fecha),
          }),
        }),
      );
    });

    it('should return cierres with fecha range (desde/hasta)', async () => {
      mockPrismaService.cierres_caja.findMany.mockResolvedValue([]);

      await repository.findAll({
        fecha_desde: '2026-04-01',
        fecha_hasta: '2026-04-30',
      });

      expect(prisma.cierres_caja.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: {
              gte: new Date('2026-04-01'),
              lte: new Date('2026-04-30'),
            },
          }),
        }),
      );
    });

    it('should return empty array if no cierres found', async () => {
      mockPrismaService.cierres_caja.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});
      expect(result).toEqual([]);
    });
  });

  // ✅ findById
  describe('findById', () => {
    it('should return cierre by id with relations', async () => {
      const mockCierre = {
        id: '1',
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: new Date('2026-04-20'),
        total_ventas: new Decimal(5000),
        cajas: { numero: 1, nombre: 'Caja 1' },
        usuarios: { username: 'admin' },
      };

      mockPrismaService.cierres_caja.findUnique.mockResolvedValue(mockCierre);

      const result = await repository.findById('1');

      expect(result).toEqual(mockCierre);
      expect(prisma.cierres_caja.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          cajas: { select: { numero: true, nombre: true } },
          usuarios: { select: { username: true } },
        },
      });
    });

    it('should return null if cierre not found', async () => {
      mockPrismaService.cierres_caja.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  // ✅ findByCajaAndFecha
  describe('findByCajaAndFecha', () => {
    it('should return cierre for specific caja and fecha', async () => {
      const cajaId = '550e8400-e29b-41d4-a716-446655440000';
      const fecha = new Date('2026-04-20T15:30:00');
      const fechaSolo = new Date('2026-04-20T00:00:00');

      const mockCierre = {
        id: '1',
        caja_id: cajaId,
        fecha: fechaSolo,
      };

      mockPrismaService.cierres_caja.findFirst.mockResolvedValue(mockCierre);

      const result = await repository.findByCajaAndFecha(cajaId, fecha);

      expect(result).toEqual(mockCierre);
      expect(prisma.cierres_caja.findFirst).toHaveBeenCalledWith({
        where: {
          caja_id: cajaId,
          fecha: fechaSolo,
        },
      });
    });

    it('should return null if cierre not found for caja and fecha', async () => {
      mockPrismaService.cierres_caja.findFirst.mockResolvedValue(null);

      const result = await repository.findByCajaAndFecha(
        '550e8400-e29b-41d4-a716-446655440000',
        new Date('2026-04-20'),
      );

      expect(result).toBeNull();
    });
  });

  // ✅ create (within transaction)
  describe('create', () => {
    it('should create cierre within transaction', async () => {
      const createData = {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: new Date('2026-04-20'),
        total_efectivo: 3000,
        total_debito: 1500,
        total_credito: 500,
        total_transferencia: 0,
        total_qr: 0,
        total_ventas: 5000,
        efectivo_sistema: 1700,
        efectivo_fisico: 1700,
        diferencia_efectivo: 0,
        motivo_diferencia: null,
        usuario_id: 'user-1',
        observaciones: null,
      };

      const mockCreatedCierre = {
        id: '1',
        ...createData,
        created_at: new Date(),
      };

      const mockTx = {
        cierres_caja: {
          create: jest.fn().mockResolvedValue(mockCreatedCierre),
        },
      };

      const result = await repository.create(createData, mockTx as any);

      expect(result).toEqual(mockCreatedCierre);
      expect(mockTx.cierres_caja.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });
});
