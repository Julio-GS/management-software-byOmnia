import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UnidadesMedidaRepository } from './unidades-medida.repository';
import { CreateUnidadMedidaDto } from '../dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from '../dto/update-unidad-medida.dto';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  unidades_medida: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UnidadesMedidaRepository', () => {
  let repository: UnidadesMedidaRepository;
  let prisma: typeof mockPrismaService;

  const mockUnidadMedida = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Kilogramo',
    abreviatura: 'kg',
    tipo: 'peso',
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadesMedidaRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UnidadesMedidaRepository>(UnidadesMedidaRepository);
    prisma = module.get(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all unidades de medida without filters', async () => {
      const mockData = [mockUnidadMedida];
      prisma.unidades_medida.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll();

      expect(result).toEqual(mockData);
      expect(prisma.unidades_medida.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter by tipo', async () => {
      const mockData = [mockUnidadMedida];
      prisma.unidades_medida.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ tipo: 'peso' });

      expect(result).toEqual(mockData);
      expect(prisma.unidades_medida.findMany).toHaveBeenCalledWith({
        where: { tipo: 'peso' },
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter by activo', async () => {
      const mockData = [mockUnidadMedida];
      prisma.unidades_medida.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ activo: true });

      expect(result).toEqual(mockData);
      expect(prisma.unidades_medida.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter by tipo and activo', async () => {
      const mockData = [mockUnidadMedida];
      prisma.unidades_medida.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ tipo: 'peso', activo: true });

      expect(result).toEqual(mockData);
      expect(prisma.unidades_medida.findMany).toHaveBeenCalledWith({
        where: { tipo: 'peso', activo: true },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a unidad de medida by id', async () => {
      prisma.unidades_medida.findUnique.mockResolvedValue(mockUnidadMedida);

      const result = await repository.findById(mockUnidadMedida.id);

      expect(result).toEqual(mockUnidadMedida);
      expect(prisma.unidades_medida.findUnique).toHaveBeenCalledWith({
        where: { id: mockUnidadMedida.id },
      });
    });

    it('should return null if not found', async () => {
      prisma.unidades_medida.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByAbreviatura', () => {
    it('should return a unidad de medida by abreviatura', async () => {
      prisma.unidades_medida.findFirst.mockResolvedValue(mockUnidadMedida);

      const result = await repository.findByAbreviatura('kg');

      expect(result).toEqual(mockUnidadMedida);
      expect(prisma.unidades_medida.findFirst).toHaveBeenCalledWith({
        where: { abreviatura: 'kg' },
      });
    });

    it('should return null if not found', async () => {
      prisma.unidades_medida.findFirst.mockResolvedValue(null);

      const result = await repository.findByAbreviatura('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new unidad de medida', async () => {
      const createDto: CreateUnidadMedidaDto = {
        nombre: 'Kilogramo',
        abreviatura: 'kg',
        tipo: 'peso',
      };
      
      prisma.unidades_medida.findFirst.mockResolvedValue(null);
      prisma.unidades_medida.create.mockResolvedValue(mockUnidadMedida);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockUnidadMedida);
      expect(prisma.unidades_medida.create).toHaveBeenCalledWith({
        data: {
          nombre: createDto.nombre,
          abreviatura: createDto.abreviatura,
          tipo: createDto.tipo,
        },
      });
    });

    it('should throw BadRequestException if abreviatura exists', async () => {
      const createDto: CreateUnidadMedidaDto = {
        nombre: 'Kilogramo',
        abreviatura: 'kg',
        tipo: 'peso',
      };
      
      prisma.unidades_medida.findFirst.mockResolvedValue(mockUnidadMedida);

      await expect(repository.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a unidad de medida', async () => {
      const updateDto: UpdateUnidadMedidaDto = {
        nombre: 'Kilogramo Actualizado',
      };
      
      const updatedUnidad = { ...mockUnidadMedida, nombre: 'Kilogramo Actualizado' };
      
      prisma.unidades_medida.findUnique.mockResolvedValue(mockUnidadMedida);
      prisma.unidades_medida.findFirst.mockResolvedValue(null);
      prisma.unidades_medida.update.mockResolvedValue(updatedUnidad);

      const result = await repository.update(mockUnidadMedida.id, updateDto);

      expect(result).toEqual(updatedUnidad);
      expect(prisma.unidades_medida.update).toHaveBeenCalledWith({
        where: { id: mockUnidadMedida.id },
        data: {
          nombre: updateDto.nombre,
          abreviatura: undefined,
          tipo: undefined,
          activo: undefined,
        },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      const updateDto: UpdateUnidadMedidaDto = { nombre: 'Updated' };
      
      prisma.unidades_medida.findUnique.mockResolvedValue(null);

      await expect(repository.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if abreviatura already exists', async () => {
      const updateDto: UpdateUnidadMedidaDto = { abreviatura: 'kg2' };
      
      const existingWithAbreviatura = { ...mockUnidadMedida, id: 'different-id', abreviatura: 'kg2' };
      
      prisma.unidades_medida.findUnique.mockResolvedValue(mockUnidadMedida);
      prisma.unidades_medida.findFirst.mockResolvedValue(existingWithAbreviatura);

      await expect(repository.update(mockUnidadMedida.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a unidad de medida', async () => {
      const deletedUnidad = { ...mockUnidadMedida, activo: false };
      
      prisma.unidades_medida.findUnique.mockResolvedValue(mockUnidadMedida);
      prisma.unidades_medida.update.mockResolvedValue(deletedUnidad);

      const result = await repository.softDelete(mockUnidadMedida.id);

      expect(result).toEqual(deletedUnidad);
      expect(prisma.unidades_medida.update).toHaveBeenCalledWith({
        where: { id: mockUnidadMedida.id },
        data: { activo: false },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.unidades_medida.findUnique.mockResolvedValue(null);

      await expect(repository.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});