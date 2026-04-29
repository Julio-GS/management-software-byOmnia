import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresRepository } from './repositories/proveedores.repository';
import { ProveedorEntity } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { FilterProveedoresDto } from './dto/filter-proveedores.dto';

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let repository: jest.Mocked<ProveedoresRepository>;

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
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCuit: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        {
          provide: ProveedoresRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
    repository = module.get(ProveedoresRepository);
  });

  describe('findAll', () => {
    it('should return all proveedores', async () => {
      const mockData = [mockProveedor];
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(result).toEqual(mockData);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filters to repository', async () => {
      const mockData = [mockProveedor];
      const filters: FilterProveedoresDto = { activo: true };
      repository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockData);
      expect(repository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findById', () => {
    it('should return a proveedor by id', async () => {
      repository.findById.mockResolvedValue(mockProveedor);

      const result = await service.findById(mockProveedor.id);

      expect(result).toEqual(mockProveedor);
      expect(repository.findById).toHaveBeenCalledWith(mockProveedor.id);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('should search proveedores', async () => {
      const mockData = [mockProveedor];
      repository.search.mockResolvedValue(mockData);

      const result = await service.search('ABC');

      expect(result).toEqual(mockData);
      expect(repository.search).toHaveBeenCalledWith('ABC');
    });
  });

  describe('create', () => {
    it('should create a new proveedor', async () => {
      const createDto: CreateProveedorDto = {
        nombre: 'Distribuidora ABC',
        razon_social: 'ABC Distribuciones SA',
        cuit: '30-12345678-9',
      };
      repository.create.mockResolvedValue(mockProveedor);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProveedor);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a proveedor', async () => {
      const updateDto: UpdateProveedorDto = { nombre: 'Updated' };
      const updated = { ...mockProveedor, nombre: 'Updated' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update(mockProveedor.id, updateDto);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(mockProveedor.id, updateDto);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a proveedor', async () => {
      const deleted = { ...mockProveedor, activo: false };
      repository.softDelete.mockResolvedValue(deleted);

      const result = await service.softDelete(mockProveedor.id);

      expect(result).toEqual(deleted);
      expect(repository.softDelete).toHaveBeenCalledWith(mockProveedor.id);
    });
  });
});