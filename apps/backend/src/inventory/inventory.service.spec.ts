import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { StockMovement } from './entities/inventory-movement.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;

  const mockMovement = StockMovement.fromPersistence({
    id: 'mov-123',
    producto_id: 'prod-123',
    lote_id: 'lote-123',
    tipo_movimiento: 'ENTRADA',
    cantidad: 50,
    referencia: 'Factura 001',
    observaciones: 'Ingreso inicial',
    usuario_id: 'user-1',
    fecha: new Date(),
  });

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByProducto: jest.fn(),
      recordEntrada: jest.fn(),
      recordAjuste: jest.fn(),
      recordMerma: jest.fn(),
      getTotalStock: jest.fn(),
      findLowStock: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repository = module.get(InventoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registrarEntrada', () => {
    it('debería registrar una entrada correctamente', async () => {
      repository.recordEntrada.mockResolvedValue(mockMovement);

      const params = {
        producto_id: 'prod-123',
        lote_id: 'lote-123',
        cantidad: 50,
        referencia: 'Factura 001',
      };

      const result = await service.registrarEntrada(params);

      expect(repository.recordEntrada).toHaveBeenCalledWith(
        'prod-123',
        'lote-123',
        50,
        {
          referencia: 'Factura 001',
          observaciones: undefined,
          usuario_id: undefined,
        },
      );
      expect(result).toEqual(mockMovement);
    });

    it('debería lanzar BadRequestException si falta producto_id', async () => {
      await expect(
        service.registrarEntrada({
          producto_id: '',
          lote_id: 'lote-123',
          cantidad: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si la cantidad es 0 o menor', async () => {
      await expect(
        service.registrarEntrada({
          producto_id: 'prod-123',
          lote_id: 'lote-123',
          cantidad: -10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registrarAjuste', () => {
    it('debería registrar un ajuste correctamente', async () => {
      repository.recordAjuste.mockResolvedValue(mockMovement);

      const params = {
        producto_id: 'prod-123',
        newStock: 100,
        lote_id: 'lote-123',
        observaciones: 'Ajuste por recuento',
      };

      const result = await service.registrarAjuste(params);

      expect(repository.recordAjuste).toHaveBeenCalledWith(
        'prod-123',
        100,
        {
          lote_id: 'lote-123',
          referencia: undefined,
          observaciones: 'Ajuste por recuento',
          usuario_id: undefined,
        },
      );
      expect(result).toEqual(mockMovement);
    });

    it('debería lanzar BadRequestException si el stock nuevo es negativo', async () => {
      await expect(
        service.registrarAjuste({
          producto_id: 'prod-123',
          newStock: -5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registrarMerma', () => {
    it('debería registrar una merma correctamente', async () => {
      repository.recordMerma.mockResolvedValue(mockMovement);

      const result = await service.registrarMerma({
        producto_id: 'prod-123',
        lote_id: 'lote-123',
        cantidad: 5,
        observaciones: 'Producto vencido',
      });

      expect(repository.recordMerma).toHaveBeenCalledWith(
        'prod-123',
        'lote-123',
        5,
        {
          referencia: undefined,
          observaciones: 'Producto vencido',
          usuario_id: undefined,
        },
      );
      expect(result).toEqual(mockMovement);
    });

    it('debería lanzar BadRequestException si la cantidad es 0', async () => {
      await expect(
        service.registrarMerma({
          producto_id: 'prod-123',
          lote_id: 'lote-123',
          cantidad: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMovimientos', () => {
    it('debería retornar movimientos filtrados', async () => {
      repository.findAll.mockResolvedValue([mockMovement]);

      const params = { tipo_movimiento: 'ENTRADA' };
      const result = await service.getMovimientos(params);

      expect(repository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual([mockMovement]);
    });
  });

  describe('getMovimientoById', () => {
    it('debería retornar un movimiento si existe', async () => {
      repository.findById.mockResolvedValue(mockMovement);

      const result = await service.getMovimientoById('mov-123');

      expect(repository.findById).toHaveBeenCalledWith('mov-123');
      expect(result).toEqual(mockMovement);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getMovimientoById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMovimientosByProducto', () => {
    it('debería retornar los movimientos de un producto', async () => {
      repository.findByProducto.mockResolvedValue([mockMovement]);

      const result = await service.getMovimientosByProducto('prod-123', 10);

      expect(repository.findByProducto).toHaveBeenCalledWith('prod-123', 10);
      expect(result).toEqual([mockMovement]);
    });
  });

  describe('getTotalStock', () => {
    it('debería retornar el stock total sumado', async () => {
      repository.getTotalStock.mockResolvedValue(150);

      const result = await service.getTotalStock('prod-123');

      expect(repository.getTotalStock).toHaveBeenCalledWith('prod-123');
      expect(result).toBe(150);
    });
  });

  describe('getLowStock', () => {
    it('debería retornar productos con stock bajo', async () => {
      const mockLowStock = [{ id: 'prod-1', stock_actual: 5, stock_minimo: 10 }];
      repository.findLowStock.mockResolvedValue(mockLowStock);

      const result = await service.getLowStock();

      expect(repository.findLowStock).toHaveBeenCalled();
      expect(result).toEqual(mockLowStock);
    });
  });
});
