import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadesMedidaRepository } from './repositories/unidades-medida.repository';
import { UnidadMedidaEntity } from './entities/unidad-medida.entity';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { FilterUnidadesMedidaDto } from './dto/filter-unidades-medida.dto';

describe('UnidadesMedidaService', () => {
  let service: UnidadesMedidaService;
  let repository: jest.Mocked<UnidadesMedidaRepository>;

  const mockUnidadMedida: UnidadMedidaEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Kilogramo',
    abreviatura: 'kg',
    tipo: 'peso',
    activo: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadesMedidaService,
        {
          provide: UnidadesMedidaRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UnidadesMedidaService>(UnidadesMedidaService);
    repository = module.get(UnidadesMedidaRepository);
  });

  describe('findAll', () => {
    it('should return all unidades de medida', async () => {
      const mockData = [mockUnidadMedida];
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filters to repository', async () => {
      const mockData = [mockUnidadMedida];
      const filters: FilterUnidadesMedidaDto = { tipo: 'peso', activo: true };
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockData);
      expect(repository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findById', () => {
    it('should return a unidad de medida by id', async () => {
      repository.findById.mockResolvedValue(mockUnidadMedida);

      const result = await service.findById(mockUnidadMedida.id);

      expect(result).toEqual(mockUnidadMedida);
      expect(repository.findById).toHaveBeenCalledWith(mockUnidadMedida.id);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new unidad de medida', async () => {
      const createDto: CreateUnidadMedidaDto = {
        nombre: 'Kilogramo',
        abreviatura: 'kg',
        tipo: 'peso',
      };
      repository.create.mockResolvedValue(mockUnidadMedida);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUnidadMedida);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a unidad de medida', async () => {
      const updateDto: UpdateUnidadMedidaDto = { nombre: 'Updated' };
      const updated = { ...mockUnidadMedida, nombre: 'Updated' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update(mockUnidadMedida.id, updateDto);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(mockUnidadMedida.id, updateDto);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a unidad de medida', async () => {
      const deleted = { ...mockUnidadMedida, activo: false };
      repository.softDelete.mockResolvedValue(deleted);

      const result = await service.softDelete(mockUnidadMedida.id);

      expect(result).toEqual(deleted);
      expect(repository.softDelete).toHaveBeenCalledWith(mockUnidadMedida.id);
    });
  });
});