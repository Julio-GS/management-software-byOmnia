import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { DevolucionesController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto, FilterDevolucionesDto } from './dto';
import { ProcesarDevolucionCommand } from './commands/procesar-devolucion.command';

describe('DevolucionesController', () => {
  let controller: DevolucionesController;
  let service: DevolucionesService;
  let commandBus: CommandBus;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174004';
  const mockUser = {
    id: mockUserId,
    username: 'cajero1',
    role: 'cajero',
  };

  const mockDevolucion = {
    devolucion: {
      id: '123e4567-e89b-12d3-a456-426614174003',
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      producto_id: '123e4567-e89b-12d3-a456-426614174001',
      lote_id: '123e4567-e89b-12d3-a456-426614174002',
      cantidad: 5,
      monto_devuelto: 450,
      tipo_devolucion: 'efectivo',
      medio_devolucion: 'efectivo',
      motivo: 'Producto defectuoso',
      observaciones: null,
      fecha: new Date('2024-01-15'),
      usuario_id: mockUserId,
    },
    producto: {
      codigo: 'PROD001',
      detalle: 'Producto Test',
    },
    venta: {
      numero_ticket: 'SALE-20240115-0001',
    },
    lote: {
      numero_lote: 'LOTE001',
    },
  };

  const mockService = {
    createDevolucion: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByVenta: jest.fn(),
  };

  const mockCommandBus = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevolucionesController],
      providers: [
        {
          provide: DevolucionesService,
          useValue: mockService,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    controller = module.get<DevolucionesController>(DevolucionesController);
    service = module.get<DevolucionesService>(DevolucionesService);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a devolucion', async () => {
      const createDto: CreateDevolucionDto = {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      };

      mockService.createDevolucion.mockResolvedValue(mockDevolucion);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockDevolucion);
      expect(mockService.createDevolucion).toHaveBeenCalledWith(createDto, mockUserId);
    });

    it('should pass userId from current user', async () => {
      const createDto: CreateDevolucionDto = {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 3,
        tipo_devolucion: 'transferencia',
        medio_devolucion: 'transferencia',
        motivo: 'Cliente arrepentido',
      };

      mockService.createDevolucion.mockResolvedValue(mockDevolucion);

      await controller.create(createDto, mockUser);

      expect(mockService.createDevolucion).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated devoluciones', async () => {
      const filters: FilterDevolucionesDto = { page: 1, limit: 20 };
      const mockResult = { data: [mockDevolucion], total: 1 };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledWith(filters);
    });

    it('should apply filters', async () => {
      const filters: FilterDevolucionesDto = {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        tipo_devolucion: 'efectivo',
        page: 2,
        limit: 10,
      };
      mockService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll(filters);

      expect(mockService.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('findOne', () => {
    it('should return devolucion by id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174003';
      mockService.findOne.mockResolvedValue(mockDevolucion);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockDevolucion);
      expect(mockService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('findByVenta', () => {
    it('should return all devoluciones for venta', async () => {
      const ventaId = '123e4567-e89b-12d3-a456-426614174000';
      const mockDevoluciones = [mockDevolucion];
      mockService.findByVenta.mockResolvedValue(mockDevoluciones);

      const result = await controller.findByVenta(ventaId);

      expect(result).toEqual(mockDevoluciones);
      expect(mockService.findByVenta).toHaveBeenCalledWith(ventaId);
    });

    it('should return empty array when no devoluciones', async () => {
      const ventaId = '123e4567-e89b-12d3-a456-426614174000';
      mockService.findByVenta.mockResolvedValue([]);

      const result = await controller.findByVenta(ventaId);

      expect(result).toEqual([]);
    });
  });

  describe('guards and decorators', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have proper metadata for role-based access', () => {
      // This test verifies that @Roles decorator is applied
      const metadata = Reflect.getMetadata('roles', controller.create);
      expect(metadata).toBeDefined();
      expect(metadata).toContain('cajero');
      expect(metadata).toContain('encargado');
      expect(metadata).toContain('admin');
    });
  });

  describe('procesarDevolucion (CQRS endpoint)', () => {
    it('should process devolucion via CommandBus and return result', async () => {
      const dto = {
        ventaId: '123e4567-e89b-12d3-a456-426614174000',
        productoId: '123e4567-e89b-12d3-a456-426614174001',
        cantidadDevuelta: 3,
        motivoDevolucion: 'Producto defectuoso - embalaje roto',
      };

      const expectedResult = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        venta_id: 123,
        producto_id: 456,
        cantidad: 3,
        monto_devuelto: 270,
        motivo: 'Producto defectuoso - embalaje roto',
      };

      mockCommandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.procesarDevolucion(dto);

      expect(result).toEqual(expectedResult);
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(ProcesarDevolucionCommand),
      );
    });

    it('should throw error when CommandBus fails validation', async () => {
      const dto = {
        ventaId: '123e4567-e89b-12d3-a456-426614174000',
        productoId: '123e4567-e89b-12d3-a456-426614174001',
        cantidadDevuelta: 10, // cantidad excedida
        motivoDevolucion: 'Motivo válido',
      };

      mockCommandBus.execute.mockRejectedValue(
        new Error('No se puede devolver más de lo comprado'),
      );

      await expect(controller.procesarDevolucion(dto)).rejects.toThrow(
        'No se puede devolver más de lo comprado',
      );
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass correct command parameters to CommandBus', async () => {
      const dto = {
        ventaId: '123e4567-e89b-12d3-a456-426614174000',
        productoId: '123e4567-e89b-12d3-a456-426614174001',
        cantidadDevuelta: 2,
        motivoDevolucion: 'Cliente no satisfecho',
      };

      mockCommandBus.execute.mockResolvedValue({});

      await controller.procesarDevolucion(dto);

      const executedCommand = mockCommandBus.execute.mock.calls[0][0];
      expect(executedCommand).toBeInstanceOf(ProcesarDevolucionCommand);
      expect(executedCommand.venta_id).toBe(dto.ventaId);
      expect(executedCommand.producto_id).toBe(dto.productoId);
      expect(executedCommand.cantidad).toBe(dto.cantidadDevuelta);
      expect(executedCommand.motivo).toBe(dto.motivoDevolucion);
    });
  });
});
