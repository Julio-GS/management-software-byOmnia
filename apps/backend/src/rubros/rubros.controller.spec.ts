import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RubrosController } from './rubros.controller';
import { RubrosService } from './rubros.service';
import { PricingService } from '../pricing/pricing.service';

describe('RubrosController', () => {
  let controller: RubrosController;
  let service: jest.Mocked<RubrosService>;
  let pricingService: jest.Mocked<PricingService>;

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
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findChildren: jest.fn(),
      findTree: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockPricingService = {
      recalculatePricesForCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RubrosController],
      providers: [
        {
          provide: RubrosService,
          useValue: mockService,
        },
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
      ],
    }).compile();

    controller = module.get<RubrosController>(RubrosController);
    service = module.get(RubrosService);
    pricingService = module.get(PricingService);
  });

  describe('findAll', () => {
    it('should return all rubros', async () => {
      const mockData = [mockRubro];
      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll({});

      expect(result).toEqual(mockData);
    });
  });

  describe('findOne', () => {
    it('should return a rubro by id', async () => {
      service.findById.mockResolvedValue(mockRubro);

      const result = await controller.findOne(mockRubro.id);

      expect(result).toEqual(mockRubro);
    });

    it('should throw NotFoundException if not found', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findChildren', () => {
    it('should return children of a rubro', async () => {
      const childRubro = { ...mockRubro, id: 'child-id', nivel: 2 };
      service.findChildren.mockResolvedValue([childRubro]);

      const result = await controller.findChildren(mockRubro.id);

      expect(result).toEqual([childRubro]);
    });
  });

  describe('findTree', () => {
    it('should return hierarchical tree', async () => {
      const treeData = [mockRubro];
      service.findTree.mockResolvedValue(treeData);

      const result = await controller.findTree();

      expect(result).toEqual(treeData);
    });
  });

  describe('create', () => {
    it('should create a new rubro', async () => {
      const createDto = {
        nombre: 'Bebidas',
        descripcion: 'Bebidas en Geral',
        codigo: 'BEB',
      };
      service.create.mockResolvedValue(mockRubro);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockRubro);
    });
  });

  describe('update', () => {
    it('should update a rubro', async () => {
      const updateDto = { nombre: 'Updated' };
      const updated = { ...mockRubro, nombre: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockRubro.id, updateDto);

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft delete a rubro', async () => {
      const deleted = { ...mockRubro, activo: false };
      service.softDelete.mockResolvedValue(deleted);

      const result = await controller.remove(mockRubro.id);

      expect(result).toEqual(deleted);
    });

    it('should throw NotFoundException if not found', async () => {
      service.softDelete.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});