import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RubrosRepository } from './rubros.repository';
import { CreateRubroDto } from '../dto/create-rubro.dto';
import { UpdateRubroDto } from '../dto/update-rubro.dto';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  rubros: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('RubrosRepository', () => {
  let repository: RubrosRepository;
  let prisma: typeof mockPrismaService;

const mockRubro: any = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Bebidas',
    descripcion: 'Bebidas en Geral',
    codigo: 'BEB',
    parent_id: null,
    nivel: 1,
    default_markup: 30,
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
    hijos: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubrosRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<RubrosRepository>(RubrosRepository);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all rubros without filters', async () => {
      const mockData = [mockRubro];
      prisma.rubros.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll();

      expect(result).toEqual(mockData);
    });

    it('should filter by activo', async () => {
      const mockData = [mockRubro];
      prisma.rubros.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ activo: true });

      expect(result).toEqual(mockData);
    });

    it('should filter by nivel', async () => {
      const mockData = [mockRubro];
      prisma.rubros.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ nivel: 1 });

      expect(result).toEqual(mockData);
    });
  });

  describe('findById', () => {
    it('should return a rubro by id', async () => {
      prisma.rubros.findUnique.mockResolvedValue(mockRubro);

      const result = await repository.findById(mockRubro.id);

      expect(result).toEqual(mockRubro);
    });

    it('should return null if not found', async () => {
      prisma.rubros.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findChildren', () => {
    it('should return children of a rubro', async () => {
      const childRubro = { ...mockRubro, id: 'child-id', parent_id: mockRubro.id, nivel: 2 };
      prisma.rubros.findMany.mockResolvedValue([childRubro]);

      const result = await repository.findChildren(mockRubro.id);

      expect(result).toEqual([childRubro]);
    });
  });

  describe('findRootRubros', () => {
    it('should return root-level rubros', async () => {
      prisma.rubros.findMany.mockResolvedValue([mockRubro]);

      const result = await repository.findRootRubros();

      expect(result).toEqual([mockRubro]);
    });
  });

  describe('calculateNivel', () => {
    it('should calculate nivel for child', async () => {
      const parentRubro = { ...mockRubro, nivel: 1 };
      prisma.rubros.findUnique.mockResolvedValue(parentRubro);

      const result = await repository.calculateNivel(parentRubro.id);

      expect(result).toBe(2);
    });

    it('should throw if parent not found', async () => {
      prisma.rubros.findUnique.mockResolvedValue(null);

      await expect(repository.calculateNivel('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasActiveChildren', () => {
    it('should return true if has active children', async () => {
      const childRubro = { ...mockRubro, id: 'child-id' };
      prisma.rubros.findMany.mockResolvedValue([childRubro]);

      const result = await repository.hasActiveChildren(mockRubro.id);

      expect(result).toBe(true);
    });

    it('should return false if no active children', async () => {
      prisma.rubros.findMany.mockResolvedValue([]);

      const result = await repository.hasActiveChildren(mockRubro.id);

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new rubro at level 1', async () => {
      const createDto: CreateRubroDto = {
        nombre: 'Bebidas',
        descripcion: 'Bebidas en geral',
        codigo: 'BEB',
      };

      prisma.rubros.create.mockResolvedValue(mockRubro);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockRubro);
    });

    it('should create a child rubro with calculated nivel', async () => {
      const createDto: CreateRubroDto = {
        nombre: 'Gaseosas',
        parent_id: mockRubro.id,
      };

      const childRubro = { ...mockRubro, id: 'child-id', parent_id: mockRubro.id, nivel: 2 };
      prisma.rubros.findUnique.mockResolvedValue(mockRubro);
      prisma.rubros.create.mockResolvedValue(childRubro);

      const result = await repository.create(createDto);

      expect(result).toEqual(childRubro);
    });

    it('should throw if max nivel reached', async () => {
      const createDto: CreateRubroDto = {
        nombre: 'Deep Child',
        parent_id: mockRubro.id,
      };

      const parentRubro = { ...mockRubro, nivel: 3 };
      prisma.rubros.findUnique.mockResolvedValue(parentRubro);

      await expect(repository.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a rubro', async () => {
      const updateDto: UpdateRubroDto = { nombre: 'Updated' };
      const updated = { ...mockRubro, nombre: 'Updated' };

      prisma.rubros.findUnique.mockResolvedValue(mockRubro);
      prisma.rubros.update.mockResolvedValue(updated);

      const result = await repository.update(mockRubro.id, updateDto);

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if not found', async () => {
      const updateDto: UpdateRubroDto = { nombre: 'Updated' };

      prisma.rubros.findUnique.mockResolvedValue(null);

      await expect(repository.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a rubro', async () => {
      const deleted = { ...mockRubro, activo: false };

      prisma.rubros.findUnique.mockResolvedValue(mockRubro);
      prisma.rubros.findMany.mockResolvedValue([]);
      prisma.rubros.update.mockResolvedValue(deleted);

      const result = await repository.softDelete(mockRubro.id);

      expect(result).toEqual(deleted);
    });

    it('should throw if has active children', async () => {
      const childRubro = { ...mockRubro, id: 'child-id' };
      prisma.rubros.findUnique.mockResolvedValue(mockRubro);
      prisma.rubros.findMany.mockResolvedValue([childRubro]);

      await expect(repository.softDelete(mockRubro.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.rubros.findUnique.mockResolvedValue(null);

      await expect(repository.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});