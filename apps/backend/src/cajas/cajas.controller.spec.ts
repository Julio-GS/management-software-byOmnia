import { Test, TestingModule } from '@nestjs/testing';
import { CajasController } from './cajas.controller';
import { CajasService } from './cajas.service';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { FilterCajasDto } from './dto/filter-cajas.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CajasController', () => {
  let controller: CajasController;
  let service: CajasService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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
      controllers: [CajasController],
      providers: [{ provide: CajasService, useValue: mockService }],
    }).compile();

    controller = module.get<CajasController>(CajasController);
    service = module.get<CajasService>(CajasService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a caja', async () => {
      const dto: CreateCajaDto = {
        numero: 1,
        nombre: 'Caja 1',
        descripcion: 'Caja principal',
      };
      mockService.create.mockResolvedValue(mockCaja);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCaja);
    });

    it('should throw ConflictException if numero already exists', async () => {
      const dto: CreateCajaDto = { numero: 1, nombre: 'Caja Duplicate' };
      mockService.create.mockRejectedValue(
        new ConflictException('Número de caja ya existe'),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all cajas', async () => {
      const filters: FilterCajasDto = { activo: true };
      mockService.findAll.mockResolvedValue([mockCaja]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual([mockCaja]);
    });

    it('should return empty array if no cajas', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a caja by id', async () => {
      mockService.findById.mockResolvedValue(mockCaja);

      const result = await controller.findOne('caja-uuid-1');

      expect(service.findById).toHaveBeenCalledWith('caja-uuid-1');
      expect(result).toEqual(mockCaja);
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException('Caja no encontrada'),
      );

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a caja', async () => {
      const dto: UpdateCajaDto = { nombre: 'Caja Express' };
      const updatedCaja = { ...mockCaja, nombre: 'Caja Express' };
      mockService.update.mockResolvedValue(updatedCaja);

      const result = await controller.update('caja-uuid-1', dto);

      expect(service.update).toHaveBeenCalledWith('caja-uuid-1', dto);
      expect(result).toEqual(updatedCaja);
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException('Caja no encontrada'),
      );

      await expect(controller.update('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a caja', async () => {
      mockService.softDelete.mockResolvedValue(undefined);

      await controller.remove('caja-uuid-1');

      expect(service.softDelete).toHaveBeenCalledWith('caja-uuid-1');
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockService.softDelete.mockRejectedValue(
        new NotFoundException('Caja no encontrada'),
      );

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if caja has ventas today', async () => {
      mockService.softDelete.mockRejectedValue(
        new ConflictException('No se puede desactivar: tiene ventas del día'),
      );

      await expect(controller.remove('caja-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
