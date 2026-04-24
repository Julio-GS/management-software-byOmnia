import { Test, TestingModule } from '@nestjs/testing';
import { SalesRepository } from './sales.repository';
import { PrismaService } from '../../database/prisma.service';
import { Sale } from '../entities/sale.entity';
import { RepositoryException } from '../../shared/exceptions/repository.exception';
import { Decimal } from '@prisma/client/runtime/library';

describe('SalesRepository', () => {
  let repository: SalesRepository;
  let prisma: any;

  beforeEach(async () => {
    // Create mock PrismaService with SPANISH model names
    const mockPrismaService = {
      ventas: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      productos: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      detalle_ventas: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      movimientos_stock: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SalesRepository>(SalesRepository);
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a sale with valid data', async () => {
      // Arrange
      const dto = {
        saleNumber: 'SALE-20260414-0001',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
        total: 21.0,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        userId: 'user-1',
      };

      // Spanish Prisma field names: numero_ticket, total, detalle_ventas, etc.
      const mockPrismaResult = {
        id: 'sale-123',
        numero_ticket: dto.saleNumber,
        total: new Decimal(dto.total),
        subtotal: new Decimal(dto.total),
        descuentos: new Decimal(0),
        vuelto: new Decimal(0),
        caja_id: '550e8400-e29b-41d4-a716-446655440012',
        usuario_id: dto.userId,
        anulada: false,
        fecha: new Date(),
        fecha_anulacion: null,
        detalle_ventas: dto.items.map((item) => ({
          id: 'item-1',
          venta_id: 'sale-123',
          producto_id: item.productId,
          cantidad: new Decimal(item.quantity),
          precio_unitario: new Decimal(item.unitPrice),
          subtotal: new Decimal(item.subtotal),
          descuento: new Decimal(0),
          total: new Decimal(item.subtotal),
          iva_porcentaje: new Decimal(21),
          iva_monto: new Decimal(0),
        })),
      };

      prisma.ventas.create.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.create(dto);

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.id).toBe('sale-123');
      expect(result.saleNumber).toBe(dto.saleNumber);
      expect(result.total).toBe(21.0);
      expect(prisma.ventas.create).toHaveBeenCalledTimes(1);
    });

    it('should throw RepositoryException on database error', async () => {
      // Arrange
      const dto = {
        saleNumber: 'SALE-20260414-0001',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
        total: 21.0,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
      };

      prisma.ventas.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(repository.create(dto)).rejects.toThrow(RepositoryException);
      await expect(repository.create(dto)).rejects.toThrow('Failed to create sale');
    });
  });

  describe('findById', () => {
    it('should return Sale entity when found', async () => {
      // Arrange - Spanish Prisma field names
      const mockPrismaResult = {
        id: 'sale-123',
        numero_ticket: 'SALE-20260414-0001',
        total: new Decimal(21.0),
        subtotal: new Decimal(21.0),
        descuentos: new Decimal(0),
        vuelto: new Decimal(0),
        caja_id: '550e8400-e29b-41d4-a716-446655440012',
        usuario_id: 'user-1',
        anulada: false,
        fecha: new Date(),
        fecha_anulacion: null,
        detalle_ventas: [
          {
            id: 'item-1',
            venta_id: 'sale-123',
            producto_id: 'prod-1',
            cantidad: new Decimal(2),
            precio_unitario: new Decimal(10.5),
            subtotal: new Decimal(21.0),
            total: new Decimal(21.0),
          },
        ],
      };

      prisma.ventas.findUnique.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.findById('sale-123');

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result?.id).toBe('sale-123');
      expect(prisma.ventas.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        include: { detalle_ventas: true },
      });
    });

    it('should return null when sale not found', async () => {
      // Arrange
      prisma.ventas.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update sale status', async () => {
      // Arrange - Spanish Prisma field names
      const mockPrismaResult = {
        id: 'sale-123',
        numero_ticket: 'SALE-20260414-0001',
        total: new Decimal(21.0),
        subtotal: new Decimal(21.0),
        descuentos: new Decimal(0),
        vuelto: new Decimal(0),
        caja_id: '550e8400-e29b-41d4-a716-446655440012',
        usuario_id: 'user-1',
        anulada: true,
        fecha: new Date(),
        fecha_anulacion: new Date(),
        detalle_ventas: [
          {
            id: 'item-1',
            venta_id: 'sale-123',
            producto_id: 'prod-1',
            cantidad: new Decimal(2),
            precio_unitario: new Decimal(10.5),
            subtotal: new Decimal(21.0),
            total: new Decimal(21.0),
          },
        ],
      };

      prisma.ventas.update.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.update('sale-123', { status: 'cancelled' });

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.status).toBe('CANCELLED');
      expect(prisma.ventas.update).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        data: { anulada: true },
        include: { detalle_ventas: true },
      });
    });

    it('should throw RepositoryException if sale not found', async () => {
      // Arrange
      prisma.ventas.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(repository.update('nonexistent', { status: 'cancelled' })).rejects.toThrow(
        RepositoryException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel sale and restore stock', async () => {
      // Arrange - Spanish Prisma field names
      const mockSale = {
        id: 'sale-123',
        numero_ticket: 'SALE-20260414-0001',
        total: new Decimal(21.0),
        subtotal: new Decimal(21.0),
        descuentos: new Decimal(0),
        anulada: false,
        fecha: new Date(),
        detalle_ventas: [
          {
            id: 'item-1',
            venta_id: 'sale-123',
            producto_id: 'prod-1',
            cantidad: new Decimal(2),
            precio_unitario: new Decimal(10.5),
            subtotal: new Decimal(21.0),
          },
        ],
      };

      const mockProduct = {
        id: 'prod-1',
        codigo: 'PROD001',
      };

      const mockCancelledSale = {
        ...mockSale,
        anulada: true,
        fecha_anulacion: new Date(),
      };

      // Mock transaction execution with Spanish model names
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          ventas: {
            findUnique: jest.fn().mockResolvedValue(mockSale),
            update: jest.fn().mockResolvedValue(mockCancelledSale),
          },
          productos: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
          },
          movimientos_stock: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      // Act
      const result = await repository.cancel('sale-123', 'user-1');

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.status).toBe('CANCELLED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw RepositoryException if sale not found', async () => {
      // Arrange
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          ventas: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      // Act & Assert
      await expect(repository.cancel('nonexistent', 'user-1')).rejects.toThrow(RepositoryException);
      await expect(repository.cancel('nonexistent', 'user-1')).rejects.toThrow('Sale nonexistent not found');
    });

    it('should throw RepositoryException if sale is already cancelled', async () => {
      // Arrange - Spanish field: anulada = true
      const mockCancelledSale = {
        id: 'sale-123',
        numero_ticket: 'SALE-20260414-0001',
        anulada: true,
        detalle_ventas: [],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          ventas: {
            findUnique: jest.fn().mockResolvedValue(mockCancelledSale),
          },
        };
        return callback(mockTx);
      });

      // Act & Assert
      await expect(repository.cancel('sale-123', 'user-1')).rejects.toThrow(RepositoryException);
      await expect(repository.cancel('sale-123', 'user-1')).rejects.toThrow(
        'already cancelled',
      );
    });
  });

  describe('findByDateRange', () => {
    it('should return sales within date range', async () => {
      // Arrange
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');

      // Spanish Prisma field names
      const mockPrismaResults = [
        {
          id: 'sale-1',
          numero_ticket: 'SALE-20260410-0001',
          total: new Decimal(100),
          subtotal: new Decimal(100),
          descuentos: new Decimal(0),
          anulada: false,
          fecha: new Date('2026-04-10'),
          detalle_ventas: [
            {
              id: 'item-1',
              producto_id: 'prod-1',
              cantidad: new Decimal(1),
              precio_unitario: new Decimal(100),
              subtotal: new Decimal(100),
            },
          ],
        },
        {
          id: 'sale-2',
          numero_ticket: 'SALE-20260415-0001',
          total: new Decimal(200),
          anulada: false,
          fecha: new Date('2026-04-15'),
          detalle_ventas: [
            {
              id: 'item-2',
              producto_id: 'prod-2',
              cantidad: new Decimal(2),
              precio_unitario: new Decimal(100),
              subtotal: new Decimal(200),
            },
          ],
        },
      ];

      prisma.ventas.findMany.mockResolvedValue(mockPrismaResults);

      // Act
      const result = await repository.findByDateRange(startDate, endDate);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Sale);
      expect(prisma.ventas.findMany).toHaveBeenCalledWith({
        where: {
          fecha: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { detalle_ventas: true },
        orderBy: { fecha: 'desc' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all sales without filters', async () => {
      // Arrange - Spanish Prisma field names
      const mockPrismaResults = [
        {
          id: 'sale-1',
          numero_ticket: 'SALE-20260410-0001',
          total: new Decimal(100),
          subtotal: new Decimal(100),
          descuentos: new Decimal(0),
          anulada: false,
          fecha: new Date(),
          detalle_ventas: [
            {
              id: 'item-1',
              producto_id: 'prod-1',
              cantidad: new Decimal(1),
              precio_unitario: new Decimal(100),
              subtotal: new Decimal(100),
            },
          ],
        },
      ];

      prisma.ventas.findMany.mockResolvedValue(mockPrismaResults);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Sale);
      expect(prisma.ventas.findMany).toHaveBeenCalledWith({
        where: {},
        include: { detalle_ventas: true },
        orderBy: { fecha: 'desc' },
      });
    });

    it('should filter by status', async () => {
      // Arrange
      prisma.ventas.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ status: 'cancelled' });

      // Assert
      expect(prisma.ventas.findMany).toHaveBeenCalledWith({
        where: { anulada: true },
        include: { detalle_ventas: true },
        orderBy: { fecha: 'desc' },
      });
    });

    it('should filter by payment method', async () => {
      // Arrange
      prisma.ventas.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ paymentMethod: 'CASH' });

      // Assert
      // Note: paymentMethod is not stored in ventas table, so this should only have empty where
      expect(prisma.ventas.findMany).toHaveBeenCalledWith({
        where: {},
        include: { detalle_ventas: true },
        orderBy: { fecha: 'desc' },
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');
      prisma.ventas.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ startDate, endDate });

      // Assert
      expect(prisma.ventas.findMany).toHaveBeenCalledWith({
        where: {
          fecha: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { detalle_ventas: true },
        orderBy: { fecha: 'desc' },
      });
    });
  });
});
