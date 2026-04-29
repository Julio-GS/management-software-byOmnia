import { Test, TestingModule } from '@nestjs/testing';
import { CierresCajaService } from './cierres-caja.service';
import { CierresCajaRepository } from './repositories/cierres-caja.repository';
import { PrismaService } from '../database/prisma.service';
import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Decimal } from '@prisma/client/runtime/library';

describe('CierresCajaService', () => {
  let service: CierresCajaService;
  let repository: CierresCajaRepository;
  let prisma: PrismaService;
  let eventBus: EventBus;

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCajaAndFecha: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    ventas: {
      findMany: jest.fn(),
    },
    movimientos_caja: {
      findMany: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CierresCajaService,
        {
          provide: CierresCajaRepository,
          useValue: mockRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<CierresCajaService>(CierresCajaService);
    repository = module.get<CierresCajaRepository>(CierresCajaRepository);
    prisma = module.get<PrismaService>(PrismaService);
    eventBus = module.get<EventBus>(EventBus);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ✅ calcularTotalesDia
  describe('calcularTotalesDia', () => {
    it('should calculate totales correctly with multiple medios de pago', async () => {
      const cajaId = '550e8400-e29b-41d4-a716-446655440000';
      const fecha = new Date('2026-04-20');

      // Mock ventas
      const mockVentas = [
        {
          id: '1',
          total: new Decimal(3500),
          medios_pago_venta: [
            { medio_pago: 'efectivo', monto: new Decimal(2000) },
            { medio_pago: 'debito', monto: new Decimal(1500) },
          ],
        },
        {
          id: '2',
          total: new Decimal(1500),
          medios_pago_venta: [{ medio_pago: 'efectivo', monto: new Decimal(1500) }],
        },
      ];

      // Mock movimientos (gastos + retiros)
      const mockMovimientos = [
        { tipo: 'gasto', monto: new Decimal(300) },
        { tipo: 'retiro', monto: new Decimal(1000) },
      ];

      mockPrismaService.ventas.findMany.mockResolvedValue(mockVentas);
      mockPrismaService.movimientos_caja.findMany.mockResolvedValue(
        mockMovimientos,
      );

      const result = await service.calcularTotalesDia(cajaId, fecha);

      expect(result).toEqual({
        total_efectivo: 3500, // 2000 + 1500
        total_debito: 1500,
        total_credito: 0,
        total_transferencia: 0,
        total_qr: 0,
        total_ventas: 5000, // 3500 + 1500
        efectivo_sistema: 2200, // 3500 - 300 - 1000
        total_gastos: 300,
        total_retiros: 1000,
      });
    });

    it('should calculate with zero gastos and retiros', async () => {
      const mockVentas = [
        {
          id: '1',
          total: new Decimal(1000),
          medios_pago_venta: [{ medio_pago: 'efectivo', monto: new Decimal(1000) }],
        },
      ];

      mockPrismaService.ventas.findMany.mockResolvedValue(mockVentas);
      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);

      const result = await service.calcularTotalesDia(
        '550e8400-e29b-41d4-a716-446655440000',
        new Date('2026-04-20'),
      );

      expect(result.efectivo_sistema).toBe(1000); // No deductions
      expect(result.total_gastos).toBe(0);
      expect(result.total_retiros).toBe(0);
    });

    it('should handle all medios de pago types', async () => {
      const mockVentas = [
        {
          id: '1',
          total: new Decimal(10000),
          medios_pago_venta: [
            { medio_pago: 'efectivo', monto: new Decimal(2000) },
            { medio_pago: 'debito', monto: new Decimal(2000) },
            { medio_pago: 'credito', monto: new Decimal(2000) },
            { medio_pago: 'transferencia', monto: new Decimal(2000) },
            { medio_pago: 'qr', monto: new Decimal(2000) },
          ],
        },
      ];

      mockPrismaService.ventas.findMany.mockResolvedValue(mockVentas);
      mockPrismaService.movimientos_caja.findMany.mockResolvedValue([]);

      const result = await service.calcularTotalesDia(
        '550e8400-e29b-41d4-a716-446655440000',
        new Date('2026-04-20'),
      );

      expect(result.total_efectivo).toBe(2000);
      expect(result.total_debito).toBe(2000);
      expect(result.total_credito).toBe(2000);
      expect(result.total_transferencia).toBe(2000);
      expect(result.total_qr).toBe(2000);
    });
  });

  // ✅ createCierre
  describe('createCierre', () => {
    const createDto = {
      caja_id: '550e8400-e29b-41d4-a716-446655440000',
      fecha: '2026-04-20',
      efectivo_fisico: 2200,
      motivo_diferencia: undefined,
      observaciones: undefined,
    };

    it('should create cierre with zero diferencia (no motivo required)', async () => {
      const userId = 'user-1';

      // Mock no existe cierre previo
      mockRepository.findByCajaAndFecha.mockResolvedValue(null);

      // Mock totales del día
      const mockTotales = {
        total_efectivo: 3500,
        total_debito: 1500,
        total_credito: 0,
        total_transferencia: 0,
        total_qr: 0,
        total_ventas: 5000,
        efectivo_sistema: 2200, // Matches efectivo_fisico
        total_gastos: 300,
        total_retiros: 1000,
      };

      jest.spyOn(service, 'calcularTotalesDia').mockResolvedValue(mockTotales);

      const mockCreatedCierre = {
        id: '1',
        diferencia_efectivo: new Decimal(0),
      };

      // Mock repository.create to return the cierre
      mockRepository.create.mockResolvedValue(mockCreatedCierre);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        return callback(mockTx);
      });

      const result = await service.createCierre(createDto, userId);

      expect(result).toEqual(mockCreatedCierre);
      expect(eventBus.publish).toHaveBeenCalledTimes(1); // Only CierreCajaCreatedEvent
    });

    it('should create cierre with diferencia and emit DiferenciaEfectivoDetectedEvent', async () => {
      const userId = 'user-1';
      const dtoWithDiferencia = {
        ...createDto,
        efectivo_fisico: 2100, // 100 less than sistema
        motivo_diferencia: 'Faltante de conteo',
      };

      mockRepository.findByCajaAndFecha.mockResolvedValue(null);

      const mockTotales = {
        total_efectivo: 3500,
        total_debito: 1500,
        total_credito: 0,
        total_transferencia: 0,
        total_qr: 0,
        total_ventas: 5000,
        efectivo_sistema: 2200,
        total_gastos: 300,
        total_retiros: 1000,
      };

      jest.spyOn(service, 'calcularTotalesDia').mockResolvedValue(mockTotales);

      const mockCreatedCierre = {
        id: '1',
        diferencia_efectivo: new Decimal(-100), // Faltante
      };

      // Mock repository.create to return the cierre
      mockRepository.create.mockResolvedValue(mockCreatedCierre);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        return callback(mockTx);
      });

      const result = await service.createCierre(dtoWithDiferencia, userId);

      expect(result).toEqual(mockCreatedCierre);
      expect(eventBus.publish).toHaveBeenCalledTimes(2); // CierreCajaCreatedEvent + DiferenciaEfectivoDetectedEvent
    });

    it('should throw ConflictException if cierre already exists for caja and fecha', async () => {
      mockRepository.findByCajaAndFecha.mockResolvedValue({ id: 'existing' });

      await expect(service.createCierre(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createCierre(createDto, 'user-1')).rejects.toThrow(
        'Ya existe cierre para esta caja y fecha',
      );
    });

    it('should throw error if diferencia != 0 and motivo_diferencia missing', async () => {
      mockRepository.findByCajaAndFecha.mockResolvedValue(null);

      const mockTotales = {
        total_efectivo: 3500,
        total_debito: 1500,
        total_credito: 0,
        total_transferencia: 0,
        total_qr: 0,
        total_ventas: 5000,
        efectivo_sistema: 2200,
        total_gastos: 300,
        total_retiros: 1000,
      };

      jest.spyOn(service, 'calcularTotalesDia').mockResolvedValue(mockTotales);

      const dtoSinMotivo = {
        ...createDto,
        efectivo_fisico: 2100, // Diferencia -100
        motivo_diferencia: undefined,
      };

      await expect(service.createCierre(dtoSinMotivo, 'user-1')).rejects.toThrow(
        'Diferencia de efectivo detectada',
      );
    });
  });

  // ✅ findAll
  describe('findAll', () => {
    it('should return all cierres with filters', async () => {
      const mockCierres = [{ id: '1' }, { id: '2' }];
      mockRepository.findAll.mockResolvedValue(mockCierres);

      const result = await service.findAll({ caja_id: '550e8400-e29b-41d4-a716-446655440000' });

      expect(result).toEqual(mockCierres);
      expect(repository.findAll).toHaveBeenCalledWith({
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });
  });

  // ✅ findById
  describe('findById', () => {
    it('should return cierre by id', async () => {
      const mockCierre = { id: '1' };
      mockRepository.findById.mockResolvedValue(mockCierre);

      const result = await service.findById('1');

      expect(result).toEqual(mockCierre);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });
  });
});
