import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';
import { ProveedorEntity } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { FilterProveedoresDto } from './dto/filter-proveedores.dto';

describe('ProveedoresController', () => {
  let controller: ProveedoresController;
  let service: jest.Mocked<ProveedoresService>;

  const mockProveedor: ProveedorEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nombre: 'Distribuidora ABC',
    razon_social: 'ABC Distribuciones SA',
    cuit: '30-12345678-9',
    telefono: '011-1234-5678',
    email: 'contacto@abc.com',
    direccion: 'Calle Falsa 123',
    contacto: null,
    notas: null,
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProveedoresController],
      providers: [
        {
          provide: ProveedoresService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProveedoresController>(ProveedoresController);
    service = module.get(ProveedoresService);
  });

  describe('findAll', () => {
    it('should return all proveedores', async () => {
      const mockData = [mockProveedor];
      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll({});

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query filters', async () => {
      const mockData = [mockProveedor];
      const filters: FilterProveedoresDto = { activo: true };
      service.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return a proveedor by id', async () => {
      service.findById.mockResolvedValue(mockProveedor);

      const result = await controller.findOne(mockProveedor.id);

      expect(result).toEqual(mockProveedor);
      expect(service.findById).toHaveBeenCalledWith(mockProveedor.id);
    });

    it('should throw NotFoundException if not found', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('should search proveedores', async () => {
      const mockData = [mockProveedor];
      service.search.mockResolvedValue(mockData);

      const result = await controller.search('ABC');

      expect(result).toEqual(mockData);
      expect(service.search).toHaveBeenCalledWith('ABC');
    });
  });

  describe('create', () => {
    it('should create a new proveedor', async () => {
      const createDto: CreateProveedorDto = {
        nombre: 'Distribuidora ABC',
        razon_social: 'ABC Distribuciones SA',
        cuit: '30-12345678-9',
      };
      service.create.mockResolvedValue(mockProveedor);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockProveedor);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a proveedor', async () => {
      const updateDto: UpdateProveedorDto = { nombre: 'Updated' };
      const updated = { ...mockProveedor, nombre: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockProveedor.id, updateDto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(mockProveedor.id, updateDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a proveedor', async () => {
      const deleted = { ...mockProveedor, activo: false };
      service.softDelete.mockResolvedValue(deleted);

      const result = await controller.remove(mockProveedor.id);

      expect(result).toEqual(deleted);
      expect(service.softDelete).toHaveBeenCalledWith(mockProveedor.id);
    });

    it('should throw NotFoundException if not found', async () => {
      service.softDelete.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});