import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProveedoresRepository } from './proveedores.repository';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  proveedores: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ProveedoresRepository', () => {
  let repository: ProveedoresRepository;
  let prisma: typeof mockPrismaService;

  const mockProveedor: any = {
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
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ProveedoresRepository>(ProveedoresRepository);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all proveedores without filters', async () => {
      const mockData = [mockProveedor];
      prisma.proveedores.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll();

      expect(result).toEqual(mockData);
      expect(prisma.proveedores.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter by activo', async () => {
      const mockData = [mockProveedor];
      prisma.proveedores.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ activo: true });

      expect(result).toEqual(mockData);
      expect(prisma.proveedores.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter by search term', async () => {
      const mockData = [mockProveedor];
      prisma.proveedores.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll({ search: 'ABC' });

      expect(result).toEqual(mockData);
      expect(prisma.proveedores.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { nombre: { contains: 'ABC', mode: 'insensitive' } },
            { razon_social: { contains: 'ABC', mode: 'insensitive' } },
          ],
        },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a proveedor by id', async () => {
      prisma.proveedores.findUnique.mockResolvedValue(mockProveedor);

      const result = await repository.findById(mockProveedor.id);

      expect(result).toEqual(mockProveedor);
      expect(prisma.proveedores.findUnique).toHaveBeenCalledWith({
        where: { id: mockProveedor.id },
      });
    });

    it('should return null if not found', async () => {
      prisma.proveedores.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByCuit', () => {
    it('should return a proveedor by CUIT', async () => {
      prisma.proveedores.findFirst.mockResolvedValue(mockProveedor);

      const result = await repository.findByCuit('30-12345678-9');

      expect(result).toEqual(mockProveedor);
      expect(prisma.proveedores.findFirst).toHaveBeenCalledWith({
        where: { cuit: '30-12345678-9' },
      });
    });

    it('should return null if not found', async () => {
      prisma.proveedores.findFirst.mockResolvedValue(null);

      const result = await repository.findByCuit('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search proveedores by nombre or razon_social', async () => {
      const mockData = [mockProveedor];
      prisma.proveedores.findMany.mockResolvedValue(mockData);

      const result = await repository.search('ABC');

      expect(result).toEqual(mockData);
      expect(prisma.proveedores.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { nombre: { contains: 'ABC', mode: 'insensitive' } },
            { razon_social: { contains: 'ABC', mode: 'insensitive' } },
          ],
        },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new proveedor', async () => {
      const createDto: CreateProveedorDto = {
        nombre: 'Distribuidora ABC',
        razon_social: 'ABC Distribuciones SA',
        cuit: '30-12345678-9',
      };

      prisma.proveedores.findFirst.mockResolvedValue(null);
      prisma.proveedores.create.mockResolvedValue(mockProveedor);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockProveedor);
      expect(prisma.proveedores.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw BadRequestException if CUIT exists', async () => {
      const createDto: CreateProveedorDto = {
        nombre: 'Distribuidora ABC',
        razon_social: 'ABC Distribuciones SA',
        cuit: '30-12345678-9',
      };

      prisma.proveedores.findFirst.mockResolvedValue(mockProveedor);

      await expect(repository.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a proveedor', async () => {
      const updateDto: UpdateProveedorDto = { nombre: 'Nuevo Nombre' };
      const updatedProveedor = { ...mockProveedor, nombre: 'Nuevo Nombre' };

      prisma.proveedores.findUnique.mockResolvedValue(mockProveedor);
      prisma.proveedores.findFirst.mockResolvedValue(null);
      prisma.proveedores.update.mockResolvedValue(updatedProveedor);

      const result = await repository.update(mockProveedor.id, updateDto);

      expect(result).toEqual(updatedProveedor);
    });

    it('should throw NotFoundException if not found', async () => {
      const updateDto: UpdateProveedorDto = { nombre: 'Updated' };

      prisma.proveedores.findUnique.mockResolvedValue(null);

      await expect(repository.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if CUIT already exists', async () => {
      const updateDto: UpdateProveedorDto = { cuit: '30-99999999-9' };

      const existingWithCuit = { ...mockProveedor, id: 'different-id', cuit: '30-99999999-9' };

      prisma.proveedores.findUnique.mockResolvedValue(mockProveedor);
      prisma.proveedores.findFirst.mockResolvedValue(existingWithCuit);

      await expect(repository.update(mockProveedor.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a proveedor', async () => {
      const deletedProveedor = { ...mockProveedor, activo: false };

      prisma.proveedores.findUnique.mockResolvedValue(mockProveedor);
      prisma.proveedores.update.mockResolvedValue(deletedProveedor);

      const result = await repository.softDelete(mockProveedor.id);

      expect(result).toEqual(deletedProveedor);
      expect(prisma.proveedores.update).toHaveBeenCalledWith({
        where: { id: mockProveedor.id },
        data: { activo: false },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.proveedores.findUnique.mockResolvedValue(null);

      await expect(repository.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});