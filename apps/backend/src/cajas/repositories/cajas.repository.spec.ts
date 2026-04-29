import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CajasRepository } from './cajas.repository';
import { PrismaService } from '../../database/prisma.service';
import { CreateCajaDto } from '../dto/create-caja.dto';
import { UpdateCajaDto } from '../dto/update-caja.dto';

describe('CajasRepository', () => {
  let repository: CajasRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    cajas: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ventas: {
      count: jest.fn(),
    },
  };

  const mockCaja = {
    id: 'caja-uuid-1',
    numero: 1,
    nombre: 'Caja 1',
    descripcion: 'Caja principal',
    activo: true,
    created_at: new Date('2026-04-23'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CajasRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<CajasRepository>(CajasRepository);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all cajas with activo=true by default', async () => {
      mockPrismaService.cajas.findMany.mockResolvedValue([mockCaja]);

      const result = await repository.findAll({});

      expect(prisma.cajas.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: { numero: 'asc' },
      });
      expect(result).toEqual([mockCaja]);
    });

    it('should filter by activo=false', async () => {
      const inactiveCaja = { ...mockCaja, activo: false };
      mockPrismaService.cajas.findMany.mockResolvedValue([inactiveCaja]);

      const result = await repository.findAll({ activo: false });

      expect(prisma.cajas.findMany).toHaveBeenCalledWith({
        where: { activo: false },
        orderBy: { numero: 'asc' },
      });
      expect(result).toEqual([inactiveCaja]);
    });

    it('should return empty array if no cajas', async () => {
      mockPrismaService.cajas.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return caja by id', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);

      const result = await repository.findById('caja-uuid-1');

      expect(prisma.cajas.findUnique).toHaveBeenCalledWith({
        where: { id: 'caja-uuid-1' },
      });
      expect(result).toEqual(mockCaja);
    });

    it('should return null if caja not found', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByNumero', () => {
    it('should return caja by numero', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);

      const result = await repository.findByNumero(1);

      expect(prisma.cajas.findUnique).toHaveBeenCalledWith({
        where: { numero: 1 },
      });
      expect(result).toEqual(mockCaja);
    });

    it('should return null if numero not found', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(null);

      const result = await repository.findByNumero(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create caja with unique numero', async () => {
      const dto: CreateCajaDto = {
        numero: 1,
        nombre: 'Caja 1',
        descripcion: 'Caja principal',
      };
      mockPrismaService.cajas.findUnique.mockResolvedValue(null);
      mockPrismaService.cajas.create.mockResolvedValue(mockCaja);

      const result = await repository.create(dto);

      expect(prisma.cajas.findUnique).toHaveBeenCalledWith({
        where: { numero: 1 },
      });
      expect(prisma.cajas.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(mockCaja);
    });

    it('should throw ConflictException if numero already exists', async () => {
      const dto: CreateCajaDto = {
        numero: 1,
        nombre: 'Caja Duplicate',
      };
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);

      await expect(repository.create(dto)).rejects.toThrow(ConflictException);
      await expect(repository.create(dto)).rejects.toThrow('Número de caja ya existe');
      expect(prisma.cajas.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update caja', async () => {
      const dto: UpdateCajaDto = { nombre: 'Caja Express' };
      const updatedCaja = { ...mockCaja, nombre: 'Caja Express' };
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);
      mockPrismaService.cajas.update.mockResolvedValue(updatedCaja);

      const result = await repository.update('caja-uuid-1', dto);

      expect(prisma.cajas.findUnique).toHaveBeenCalledWith({
        where: { id: 'caja-uuid-1' },
      });
      expect(prisma.cajas.update).toHaveBeenCalledWith({
        where: { id: 'caja-uuid-1' },
        data: expect.objectContaining({ nombre: 'Caja Express' }),
      });
      expect(result).toEqual(updatedCaja);
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(null);

      await expect(repository.update('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.update('non-existent-id', {})).rejects.toThrow(
        'Caja no encontrada',
      );
      expect(prisma.cajas.update).not.toHaveBeenCalled();
    });

    it('should validate numero uniqueness when changing numero', async () => {
      const dto: UpdateCajaDto = { numero: 2 };
      const caja2 = { ...mockCaja, id: 'caja-uuid-2', numero: 2 };
      
      // First call: find existing caja
      // Second call: check if new numero exists
      mockPrismaService.cajas.findUnique
        .mockResolvedValueOnce(mockCaja)
        .mockResolvedValueOnce(caja2);

      await expect(repository.update('caja-uuid-1', dto)).rejects.toThrow(
        'Número ya existe',
      );
      expect(prisma.cajas.update).not.toHaveBeenCalled();
    });

    it('should allow updating numero to same value', async () => {
      const dto: UpdateCajaDto = { numero: 1 };
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);
      mockPrismaService.cajas.update.mockResolvedValue(mockCaja);

      const result = await repository.update('caja-uuid-1', dto);

      // Should not check for duplicate since numero hasn't changed
      expect(prisma.cajas.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCaja);
    });
  });

  describe('softDelete', () => {
    it('should soft delete caja without ventas today', async () => {
      const inactiveCaja = { ...mockCaja, activo: false };
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);
      mockPrismaService.ventas.count.mockResolvedValue(0);
      mockPrismaService.cajas.update.mockResolvedValue(inactiveCaja);

      await repository.softDelete('caja-uuid-1');

      expect(prisma.cajas.findUnique).toHaveBeenCalledWith({
        where: { id: 'caja-uuid-1' },
      });
      expect(prisma.ventas.count).toHaveBeenCalled();
      expect(prisma.cajas.update).toHaveBeenCalledWith({
        where: { id: 'caja-uuid-1' },
        data: expect.objectContaining({ activo: false }),
      });
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(null);

      await expect(repository.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.softDelete('non-existent-id')).rejects.toThrow(
        'Caja no encontrada',
      );
      expect(prisma.cajas.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if caja has ventas today', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);
      mockPrismaService.ventas.count.mockResolvedValue(5);

      await expect(repository.softDelete('caja-uuid-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(repository.softDelete('caja-uuid-1')).rejects.toThrow(
        'No se puede desactivar: tiene ventas del día',
      );
      expect(prisma.cajas.update).not.toHaveBeenCalled();
    });

    it('should check for ventas only from today', async () => {
      mockPrismaService.cajas.findUnique.mockResolvedValue(mockCaja);
      mockPrismaService.ventas.count.mockResolvedValue(0);
      mockPrismaService.cajas.update.mockResolvedValue({
        ...mockCaja,
        activo: false,
      });

      await repository.softDelete('caja-uuid-1');

      const countCall = mockPrismaService.ventas.count.mock.calls[0][0];
      expect(countCall.where.caja_id).toBe('caja-uuid-1');
      expect(countCall.where.fecha).toHaveProperty('gte');
      expect(countCall.where.fecha).toHaveProperty('lt');
    });
  });
});
