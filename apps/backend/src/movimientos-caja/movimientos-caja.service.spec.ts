import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { MovimientosCajaService } from './movimientos-caja.service';
import { MovimientosCajaRepository } from './repositories/movimientos-caja.repository';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from './dto/filter-movimientos-caja.dto';
import { MovimientoCajaCreatedEvent } from './events/movimiento-caja-created.event';

describe('MovimientosCajaService', () => {
  let service: MovimientosCajaService;
  let repository: MovimientosCajaRepository;
  let eventBus: EventBus;

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByFecha: jest.fn(),
    create: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosCajaService,
        {
          provide: MovimientosCajaRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<MovimientosCajaService>(MovimientosCajaService);
    repository = module.get<MovimientosCajaRepository>(
      MovimientosCajaRepository,
    );
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create movimiento gasto', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
      };
      const userId = 'user-1';
      const mockCreated = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        usuario_id: userId,
        observaciones: null,
        fecha: new Date('2026-04-20'),
      };

      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockCreated);
      expect(repository.create).toHaveBeenCalledWith(dto, userId);
    });

    it('should create movimiento retiro', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
      };
      const userId = 'user-2';
      const mockCreated = {
        id: '2',
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
        comprobante: null,
        usuario_id: userId,
        observaciones: null,
        fecha: new Date('2026-04-20'),
      };

      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockCreated);
      expect(repository.create).toHaveBeenCalledWith(dto, userId);
    });

    it('should emit MovimientoCajaCreatedEvent after creation', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
      };
      const userId = 'user-1';
      const mockCreated = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: null,
        usuario_id: userId,
        observaciones: null,
        fecha: new Date('2026-04-20'),
      };

      mockRepository.create.mockResolvedValue(mockCreated);

      await service.create(dto, userId);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(MovimientoCajaCreatedEvent),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockCreated.id,
          tipo: mockCreated.tipo,
          monto: mockCreated.monto,
          concepto: mockCreated.concepto,
          usuario_id: mockCreated.usuario_id,
          fecha: mockCreated.fecha,
        }),
      );
    });

    it('should handle optional fields in creation', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 250.75,
        concepto: 'Compra insumos',
        comprobante: 'REC-123',
        observaciones: 'Observación de prueba',
      };
      const userId = 'user-1';
      const mockCreated = {
        id: '3',
        ...dto,
        usuario_id: userId,
        fecha: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockCreated);
      expect(repository.create).toHaveBeenCalledWith(dto, userId);
    });
  });

  describe('findAll', () => {
    it('should return paginated movimientos', async () => {
      const filters: FilterMovimientosCajaDto = { page: 1, limit: 20 };
      const mockResult = {
        data: [
          {
            id: '1',
            tipo: 'gasto',
            monto: 500,
            concepto: 'Pago de luz',
            comprobante: null,
            usuario_id: 'user-1',
            observaciones: null,
            fecha: new Date(),
            usuarios: { username: 'admin' },
          },
        ],
        total: 1,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass filters to repository', async () => {
      const filters: FilterMovimientosCajaDto = {
        page: 2,
        limit: 50,
        tipo: 'retiro',
        fecha_desde: '2026-04-01T00:00:00.000Z',
        fecha_hasta: '2026-04-30T23:59:59.999Z',
      };
      const mockResult = { data: [], total: 0 };

      mockRepository.findAll.mockResolvedValue(mockResult);

      await service.findAll(filters);

      expect(repository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return movimiento by id', async () => {
      const mockMovimiento = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        usuario_id: 'user-1',
        observaciones: 'Pago mensual',
        fecha: new Date(),
        usuarios: { username: 'admin' },
      };

      mockRepository.findById.mockResolvedValue(mockMovimiento);

      const result = await service.findOne('1');

      expect(result).toEqual(mockMovimiento);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if movimiento not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Movimiento de caja con ID non-existent-id no encontrado',
      );
    });
  });

  describe('findByFecha', () => {
    it('should return movimientos within date range', async () => {
      const desde = new Date('2026-04-20T00:00:00.000Z');
      const hasta = new Date('2026-04-20T23:59:59.999Z');
      const mockMovimientos = [
        {
          id: '1',
          tipo: 'gasto',
          monto: 500,
          concepto: 'Luz',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date('2026-04-20T10:00:00.000Z'),
        },
        {
          id: '2',
          tipo: 'retiro',
          monto: 1000,
          concepto: 'Retiro caja',
          comprobante: null,
          usuario_id: 'user-1',
          observaciones: null,
          fecha: new Date('2026-04-20T15:00:00.000Z'),
        },
      ];

      mockRepository.findByFecha.mockResolvedValue(mockMovimientos);

      const result = await service.findByFecha(desde, hasta);

      expect(result).toEqual(mockMovimientos);
      expect(repository.findByFecha).toHaveBeenCalledWith(desde, hasta);
    });

    it('should return empty array if no movimientos in range', async () => {
      const desde = new Date('2026-04-20T00:00:00.000Z');
      const hasta = new Date('2026-04-20T23:59:59.999Z');

      mockRepository.findByFecha.mockResolvedValue([]);

      const result = await service.findByFecha(desde, hasta);

      expect(result).toEqual([]);
    });
  });
});
