import { Test, TestingModule } from '@nestjs/testing';
import { BatchPushService } from './batch-push.service';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../../sales/sales.service';
import { SyncEntityType, SyncOperationType } from '../dto/batch-push.dto';

describe('BatchPushService', () => {
  let service: BatchPushService;
  let prisma: PrismaService;
  let salesService: SalesService;

  const mockPrisma = {
    ventas: {
      findFirst: jest.fn(),
    },
  };

  const mockSalesService = {
    createVenta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchPushService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SalesService, useValue: mockSalesService },
      ],
    }).compile();

    service = module.get<BatchPushService>(BatchPushService);
    prisma = module.get<PrismaService>(PrismaService);
    salesService = module.get<SalesService>(SalesService);

    jest.clearAllMocks();
  });

  it('should process a valid batch push (CREATE VENTA) successfully', async () => {
    mockPrisma.ventas.findFirst.mockResolvedValue(null); // No existe (no idempotency trigger)
    mockSalesService.createVenta.mockResolvedValue({ venta: { id: 'venta-1' }, conflictos: [] });

    const result = await service.processBatch(
      {
        caja_id: 'caja-1',
        operations: [
          {
            entity_type: SyncEntityType.VENTA,
            operation_type: SyncOperationType.CREATE,
            transaccion_id: 'tx-123',
            payload: { items: [], medios_pago: [] },
          },
        ],
      },
      'user-1',
    );

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.stock_conflicts).toHaveLength(0);
    expect(mockSalesService.createVenta).toHaveBeenCalledWith(
      { items: [], medios_pago: [], caja_id: 'caja-1', transaccion_id: 'tx-123' },
      'user-1',
      true, // isOfflineSync = true
    );
  });

  it('should skip operation if it already exists (Idempotency Check)', async () => {
    mockPrisma.ventas.findFirst.mockResolvedValue({ id: 'venta-1' }); // Ya existe

    const result = await service.processBatch(
      {
        caja_id: 'caja-1',
        operations: [
          {
            entity_type: SyncEntityType.VENTA,
            operation_type: SyncOperationType.CREATE,
            transaccion_id: 'tx-123',
            payload: {},
          },
        ],
      },
      'user-1',
    );

    expect(result.processed).toBe(1); // Cuenta como "procesado" (skipeado felizmente)
    expect(result.failed).toBe(0);
    expect(mockSalesService.createVenta).not.toHaveBeenCalled();
  });

  it('should report stock conflicts when offline sale exceeds stock', async () => {
    mockPrisma.ventas.findFirst.mockResolvedValue(null);
    mockSalesService.createVenta.mockResolvedValue({
      venta: { id: 'venta-1' },
      conflictos: [{ producto_id: 'prod-1', solicitado: 5, disponible: 2, mensaje: 'Error' }],
    });

    const result = await service.processBatch(
      {
        caja_id: 'caja-1',
        operations: [
          {
            entity_type: SyncEntityType.VENTA,
            operation_type: SyncOperationType.CREATE,
            transaccion_id: 'tx-123',
            payload: {},
          },
        ],
      },
      'user-1',
    );

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.stock_conflicts).toHaveLength(1);
    expect(result.stock_conflicts[0].producto_id).toBe('prod-1');
  });

  it('should report failure if SalesService throws error', async () => {
    mockPrisma.ventas.findFirst.mockResolvedValue(null);
    mockSalesService.createVenta.mockRejectedValue(new Error('Internal error'));

    const result = await service.processBatch(
      {
        caja_id: 'caja-1',
        operations: [
          {
            entity_type: SyncEntityType.VENTA,
            operation_type: SyncOperationType.CREATE,
            transaccion_id: 'tx-123',
            payload: {},
          },
        ],
      },
      'user-1',
    );

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].transaccion_id).toBe('tx-123');
    expect(result.errors[0].error).toBe('Internal error');
  });
});
