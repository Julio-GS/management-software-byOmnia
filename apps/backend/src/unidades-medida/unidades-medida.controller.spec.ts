import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UnidadesMedidaController } from './unidades-medida.controller';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadMedidaEntity } from './entities/unidad-medida.entity';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { FilterUnidadesMedidaDto } from './dto/filter-unidades-medida.dto';

describe('UnidadesMedidaController', () => {
  let controller: UnidadesMedidaController;
  let service: jest.Mocked<UnidadesMedidaService>;

  const mockUnidadMedida: UnidadMedidaEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Kilogramo',
    abreviatura: 'kg',
    tipo: 'peso',
    activo: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnidadesMedidaController],
      providers: [
        {
          provide: UnidadesMedidaService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UnidadesMedidaController>(UnidadesMedidaController);
    service = module.get(UnidadesMedidaService);
  });

  describe('findAll', () => {
    it('should return all unidades de medida', async () => {
      const mockData = [mockUnidadMedida];
      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll({});

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query filters', async () => {
      const mockData = [mockUnidadMedida];
      const filters: FilterUnidadesMedidaDto = { tipo: 'peso', activo: true };
      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a unidad de medida by id', async () => {
      service.findById.mockResolvedValue(mockUnidadMedida);

      const result = await controller.findOne(mockUnidadMedida.id);

      expect(result).toEqual(mockUnidadMedida);
      expect(service.findById).toHaveBeenCalledWith(mockUnidadMedida.id);
    });

    it('should throw NotFoundException if not found', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new unidad de medida', async () => {
      const createDto: CreateUnidadMedidaDto = {
        nombre: 'Kilogramo',
        abreviatura: 'kg',
        tipo: 'peso',
      };
      service.create.mockResolvedValue(mockUnidadMedida);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockUnidadMedida);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a unidad de medida', async () => {
      const updateDto: UpdateUnidadMedidaDto = { nombre: 'Updated' };
      const updated = { ...mockUnidadMedida, nombre: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockUnidadMedida.id, updateDto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(mockUnidadMedida.id, updateDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a unidad de medida', async () => {
      const deleted = { ...mockUnidadMedida, activo: false };
      service.softDelete.mockResolvedValue(deleted);

      const result = await controller.remove(mockUnidadMedida.id);

      expect(result).toEqual(deleted);
      expect(service.softDelete).toHaveBeenCalledWith(mockUnidadMedida.id);
    });

    it('should throw NotFoundException if not found', async () => {
      service.softDelete.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});