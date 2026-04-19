import { Test, TestingModule } from '@nestjs/testing';
import { SalesRepository } from './sales.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Sale } from '../entities/sale.entity';
import { RepositoryException } from '../../shared/exceptions/repository.exception';

describe('SalesRepository', () => {
  let repository: SalesRepository;
  let prisma: any;

  beforeEach(async () => {
    // Create mock PrismaService
    const mockPrismaService = {
      sale: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
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

      const mockPrismaResult = {
        id: 'sale-123',
        saleNumber: dto.saleNumber,
        totalAmount: dto.total,
        subtotal: dto.total,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: dto.paymentMethod,
        status: dto.status,
        createdAt: new Date(),
        items: dto.items.map((item) => ({
          ...item,
          id: 'item-1',
          saleId: 'sale-123',
          taxAmount: 0,
          discount: 0,
          totalAmount: item.subtotal,
        })),
      };

      prisma.sale.create.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.create(dto);

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.id).toBe('sale-123');
      expect(result.saleNumber).toBe(dto.saleNumber);
      expect(result.total).toBe(21.0);
      expect(prisma.sale.create).toHaveBeenCalledTimes(1);
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

      prisma.sale.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(repository.create(dto)).rejects.toThrow(RepositoryException);
      await expect(repository.create(dto)).rejects.toThrow('Failed to create sale');
    });
  });

  describe('findById', () => {
    it('should return Sale entity when found', async () => {
      // Arrange
      const mockPrismaResult = {
        id: 'sale-123',
        saleNumber: 'SALE-20260414-0001',
        totalAmount: 21.0,
        subtotal: 21.0,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: 'CASH',
        status: 'completed',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
      };

      prisma.sale.findUnique.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.findById('sale-123');

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result?.id).toBe('sale-123');
      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        include: { items: true },
      });
    });

    it('should return null when sale not found', async () => {
      // Arrange
      prisma.sale.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update sale status', async () => {
      // Arrange
      const mockPrismaResult = {
        id: 'sale-123',
        saleNumber: 'SALE-20260414-0001',
        totalAmount: 21.0,
        subtotal: 21.0,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: 'CASH',
        status: 'cancelled',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
      };

      prisma.sale.update.mockResolvedValue(mockPrismaResult);

      // Act
      const result = await repository.update('sale-123', { status: 'cancelled' });

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.status).toBe('cancelled');
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        data: { status: 'cancelled' },
        include: { items: true },
      });
    });

    it('should throw RepositoryException if sale not found', async () => {
      // Arrange
      prisma.sale.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(repository.update('nonexistent', { status: 'cancelled' })).rejects.toThrow(
        RepositoryException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel sale and restore stock', async () => {
      // Arrange
      const mockSale = {
        id: 'sale-123',
        saleNumber: 'SALE-20260414-0001',
        totalAmount: 21.0,
        subtotal: 21.0,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: 'CASH',
        status: 'completed',
        createdAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
          },
        ],
      };

      const mockProduct = {
        id: 'prod-1',
        stock: 8,
      };

      const mockCancelledSale = {
        ...mockSale,
        status: 'cancelled',
      };

      // Mock transaction execution
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          sale: {
            findUnique: jest.fn().mockResolvedValue(mockSale),
            update: jest.fn().mockResolvedValue(mockCancelledSale),
          },
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockResolvedValue({ ...mockProduct, stock: 10 }),
          },
          inventoryMovement: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      // Act
      const result = await repository.cancel('sale-123', 'user-1');

      // Assert
      expect(result).toBeInstanceOf(Sale);
      expect(result.status).toBe('cancelled');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw RepositoryException if sale not found', async () => {
      // Arrange
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          sale: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      // Act & Assert
      await expect(repository.cancel('nonexistent', 'user-1')).rejects.toThrow(RepositoryException);
      await expect(repository.cancel('nonexistent', 'user-1')).rejects.toThrow('Sale nonexistent not found');
    });

    it('should throw RepositoryException if sale is not completed', async () => {
      // Arrange
      const mockPendingSale = {
        id: 'sale-123',
        saleNumber: 'SALE-20260414-0001',
        status: 'pending',
        items: [],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          sale: {
            findUnique: jest.fn().mockResolvedValue(mockPendingSale),
          },
        };
        return callback(mockTx);
      });

      // Act & Assert
      await expect(repository.cancel('sale-123', 'user-1')).rejects.toThrow(RepositoryException);
      await expect(repository.cancel('sale-123', 'user-1')).rejects.toThrow(
        'Sale SALE-20260414-0001 cannot be cancelled: current status is pending',
      );
    });
  });

  describe('findByDateRange', () => {
    it('should return sales within date range', async () => {
      // Arrange
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');

      const mockPrismaResults = [
        {
          id: 'sale-1',
          saleNumber: 'SALE-20260410-0001',
          totalAmount: 100,
          paymentMethod: 'CASH',
          status: 'completed',
          createdAt: new Date('2026-04-10'),
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              quantity: 1,
              unitPrice: 100,
              subtotal: 100,
              productName: 'Product 1',
            },
          ],
        },
        {
          id: 'sale-2',
          saleNumber: 'SALE-20260415-0001',
          totalAmount: 200,
          paymentMethod: 'CARD',
          status: 'completed',
          createdAt: new Date('2026-04-15'),
          items: [
            {
              id: 'item-2',
              productId: 'prod-2',
              quantity: 2,
              unitPrice: 100,
              subtotal: 200,
              productName: 'Product 2',
            },
          ],
        },
      ];

      prisma.sale.findMany.mockResolvedValue(mockPrismaResults);

      // Act
      const result = await repository.findByDateRange(startDate, endDate);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Sale);
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all sales without filters', async () => {
      // Arrange
      const mockPrismaResults = [
        {
          id: 'sale-1',
          saleNumber: 'SALE-20260410-0001',
          totalAmount: 100,
          paymentMethod: 'CASH',
          status: 'completed',
          createdAt: new Date(),
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              quantity: 1,
              unitPrice: 100,
              subtotal: 100,
              productName: 'Product 1',
            },
          ],
        },
      ];

      prisma.sale.findMany.mockResolvedValue(mockPrismaResults);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Sale);
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {},
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      // Arrange
      prisma.sale.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ status: 'completed' });

      // Assert
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: { status: 'completed' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by payment method', async () => {
      // Arrange
      prisma.sale.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ paymentMethod: 'CASH' });

      // Assert
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: { paymentMethod: 'CASH' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');
      prisma.sale.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll({ startDate, endDate });

      // Assert
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
