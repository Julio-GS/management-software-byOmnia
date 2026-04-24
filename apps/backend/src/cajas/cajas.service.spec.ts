import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CajasRepository } from './repositories/cajas.repository';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

describe('CajasService', () => {
  let service: CajasService;
  let repository: CajasRepository;
  let eventBus: EventBus;

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByNumero: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
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
      providers: [
        CajasService,
        { provide: CajasRepository, useValue: mockRepository },
        { provide: EventBus, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<CajasService>(CajasService);
    repository = module.get<CajasRepository>(CajasRepository);
    eventBus = module.get<EventBus>(EventBus);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create caja and emit event', async () => {
      const dto: CreateCajaDto = {
        numero: 1,
        nombre: 'Caja 1',
        descripcion: 'Caja principal',
      };
      mockRepository.create.mockResolvedValue(mockCaja);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCaja);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          cajaId: mockCaja.id,
          numero: mockCaja.numero,
        }),
      );
    });

    it('should throw ConflictException if numero already exists', async () => {
      const dto: CreateCajaDto = { numero: 1, nombre: 'Caja Duplicate' };
      mockRepository.create.mockRejectedValue(
        new ConflictException('Número de caja ya existe'),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all cajas with default filters', async () => {
      mockRepository.findAll.mockResolvedValue([mockCaja]);

      const result = await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual([mockCaja]);
    });

    it('should pass filters to repository', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({ activo: false });

      expect(repository.findAll).toHaveBeenCalledWith({ activo: false });
    });
  });

  describe('findById', () => {
    it('should return caja by id', async () => {
      mockRepository.findById.mockResolvedValue(mockCaja);

      const result = await service.findById('caja-uuid-1');

      expect(repository.findById).toHaveBeenCalledWith('caja-uuid-1');
      expect(result).toEqual(mockCaja);
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        'Caja no encontrada',
      );
    });
  });

  describe('update', () => {
    it('should update caja and emit event', async () => {
      const dto: UpdateCajaDto = { nombre: 'Caja Express' };
      const updatedCaja = { ...mockCaja, nombre: 'Caja Express' };
      mockRepository.update.mockResolvedValue(updatedCaja);

      const result = await service.update('caja-uuid-1', dto);

      expect(repository.update).toHaveBeenCalledWith('caja-uuid-1', dto);
      expect(result).toEqual(updatedCaja);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          cajaId: updatedCaja.id,
        }),
      );
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockRepository.update.mockRejectedValue(
        new NotFoundException('Caja no encontrada'),
      );

      await expect(service.update('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if numero already exists', async () => {
      const dto: UpdateCajaDto = { numero: 2 };
      mockRepository.update.mockRejectedValue(
        new ConflictException('Número ya existe'),
      );

      await expect(service.update('caja-uuid-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should soft delete caja and emit event', async () => {
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('caja-uuid-1');

      expect(repository.softDelete).toHaveBeenCalledWith('caja-uuid-1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          cajaId: 'caja-uuid-1',
        }),
      );
    });

    it('should throw NotFoundException if caja not found', async () => {
      mockRepository.softDelete.mockRejectedValue(
        new NotFoundException('Caja no encontrada'),
      );

      await expect(service.softDelete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if caja has ventas today', async () => {
      mockRepository.softDelete.mockRejectedValue(
        new ConflictException('No se puede desactivar: tiene ventas del día'),
      );

      await expect(service.softDelete('caja-uuid-1')).rejects.toThrow(
        ConflictException,
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
