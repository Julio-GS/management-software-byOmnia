import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RubrosService } from './rubros.service';
import { RubrosRepository } from './repositories/rubros.repository';
import { RubroEntity } from './entities/rubro.entity';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto } from './dto/update-rubro.dto';

describe('RubrosService', () => {
  let service: RubrosService;
  let repository: jest.Mocked<RubrosRepository>;

  const mockRubro: any = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Bebidas',
    descripcion: 'Bebidas en geral',
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
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findChildren: jest.fn(),
      findTree: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubrosService,
        {
          provide: RubrosRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RubrosService>(RubrosService);
    repository = module.get(RubrosRepository);
  });

  describe('findAll', () => {
    it('should return all rubros', async () => {
      const mockData = [mockRubro];
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
    });
  });

  describe('findById', () => {
    it('should return a rubro by id', async () => {
      repository.findById.mockResolvedValue(mockRubro);

      const result = await service.findById(mockRubro.id);

      expect(result).toEqual(mockRubro);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findChildren', () => {
    it('should return children of a rubro', async () => {
      const childRubro = { ...mockRubro, id: 'child-id', nivel: 2 };
      repository.findChildren.mockResolvedValue([childRubro]);

      const result = await service.findChildren(mockRubro.id);

      expect(result).toEqual([childRubro]);
    });
  });

  describe('findTree', () => {
    it('should return hierarchical tree', async () => {
      const treeData = [mockRubro];
      repository.findTree.mockResolvedValue(treeData);

      const result = await service.findTree();

      expect(result).toEqual(treeData);
    });
  });

  describe('create', () => {
    it('should create a new rubro', async () => {
      const createDto: CreateRubroDto = {
        nombre: 'Bebidas',
        descripcion: 'Bebidas en geral',
        codigo: 'BEB',
      };
      repository.create.mockResolvedValue(mockRubro);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRubro);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a rubro', async () => {
      const updateDto: UpdateRubroDto = { nombre: 'Updated' };
      const updated = { ...mockRubro, nombre: 'Updated' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update(mockRubro.id, updateDto);

      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a rubro', async () => {
      const deleted = { ...mockRubro, activo: false };
      repository.softDelete.mockResolvedValue(deleted);

      const result = await service.softDelete(mockRubro.id);

      expect(result).toEqual(deleted);
    });
  });
});