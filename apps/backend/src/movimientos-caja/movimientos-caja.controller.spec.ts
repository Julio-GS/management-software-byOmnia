import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosCajaController } from './movimientos-caja.controller';
import { MovimientosCajaService } from './movimientos-caja.service';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from './dto/filter-movimientos-caja.dto';

describe('MovimientosCajaController', () => {
  let controller: MovimientosCajaController;
  let service: MovimientosCajaService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    rol: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimientosCajaController],
      providers: [
        {
          provide: MovimientosCajaService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MovimientosCajaController>(
      MovimientosCajaController,
    );
    service = module.get<MovimientosCajaService>(MovimientosCajaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create movimiento and pass user id from token', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
      };
      const mockCreated = {
        id: '1',
        tipo: 'gasto',
        monto: 500,
        concepto: 'Pago de luz',
        comprobante: 'FAC-001',
        usuario_id: 'user-1',
        observaciones: null,
        fecha: new Date(),
      };

      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(dto, mockUser as any);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
    });

    it('should create movimiento retiro', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
      };
      const mockCreated = {
        id: '2',
        tipo: 'retiro',
        monto: 10000,
        concepto: 'Retiro para banco',
        comprobante: null,
        usuario_id: 'user-1',
        observaciones: null,
        fecha: new Date(),
      };

      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(dto, mockUser as any);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
    });

    it('should handle optional fields', async () => {
      const dto: CreateMovimientoCajaDto = {
        tipo: 'gasto',
        monto: 250.75,
        concepto: 'Compra insumos',
        comprobante: 'REC-123',
        observaciones: 'Observación de prueba',
      };
      const mockCreated = {
        id: '3',
        ...dto,
        usuario_id: 'user-1',
        fecha: new Date(),
      };

      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(dto, mockUser as any);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated movimientos with default filters', async () => {
      const query: FilterMovimientosCajaDto = { page: 1, limit: 20 };
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

      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by tipo', async () => {
      const query: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        tipo: 'retiro',
      };
      const mockResult = { data: [], total: 0 };

      mockService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by date range', async () => {
      const query: FilterMovimientosCajaDto = {
        page: 1,
        limit: 20,
        fecha_desde: '2026-04-01T00:00:00.000Z',
        fecha_hasta: '2026-04-30T23:59:59.999Z',
      };
      const mockResult = { data: [], total: 0 };

      mockService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should apply custom pagination', async () => {
      const query: FilterMovimientosCajaDto = {
        page: 3,
        limit: 50,
      };
      const mockResult = { data: [], total: 0 };

      mockService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
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

      mockService.findOne.mockResolvedValue(mockMovimiento);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockMovimiento);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should handle non-existent id', async () => {
      mockService.findOne.mockRejectedValue(
        new Error('Movimiento de caja con ID non-existent-id no encontrado'),
      );

      await expect(controller.findOne('non-existent-id')).rejects.toThrow();
    });
  });
});
