import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { ISalesRepository } from './repositories/sales.repository.interface';
import { EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../database/prisma.service';
import { Sale } from './entities/sale.entity';
import { SaleCreatedEvent } from '../shared/events/sale-created.event';
import { SaleCancelledEvent } from '../shared/events/sale-cancelled.event';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('SalesService (with repository)', () => {
  let service: SalesService;
  let repository: jest.Mocked<ISalesRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let prisma: any;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByDateRange: jest.fn(),
      findAll: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const mockPrismaService = {
      sale: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: 'ISalesRepository',
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    repository = module.get('ISalesRepository') as jest.Mocked<ISalesRepository>;
    eventBus = module.get(EventBus) as jest.Mocked<EventBus>;
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create (with repository)', () => {
    it('should create a sale and emit SaleCreatedEvent', async () => {
      // Arrange
      const createSaleDto = {
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            discount: 0,
          },
        ],
        paymentMethod: 'cash' as const,
        cashierId: 'user-1',
      };

      const mockSale = new Sale(
        'sale-123',
        'SALE-20260414-0001',
        [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
        21.0,
        'CASH',
        'COMPLETED',
        new Date(),
      );

      repository.create.mockResolvedValue(mockSale);
      prisma.sale.count.mockResolvedValue(0);

      // Act
      const result = await service.create(createSaleDto);

      // Assert
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SaleCreatedEvent));
    });

    it('should throw BadRequestException if items array is empty', async () => {
      // Arrange
      const createSaleDto = {
        items: [],
        paymentMethod: 'cash' as const,
        cashierId: 'user-1',
      };

      // Act & Assert
      await expect(service.create(createSaleDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createSaleDto)).rejects.toThrow('Sale must contain at least one item');
    });

    it('should validate product existence before creating sale', async () => {
      // Arrange
      const createSaleDto = {
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            discount: 0,
          },
        ],
        paymentMethod: 'cash' as const,
        cashierId: 'user-1',
      };

      prisma.sale.count.mockResolvedValue(0);
      repository.create.mockRejectedValue(new NotFoundException('Product with ID nonexistent not found'));

      // Act & Assert
      await expect(service.create(createSaleDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel (with repository)', () => {
    it('should cancel sale and emit SaleCancelledEvent', async () => {
      // Arrange
      const mockSale = new Sale(
        'sale-123',
        'SALE-20260414-0001',
        [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
        21.0,
        'CASH',
        'CANCELLED',
        new Date(),
      );

      repository.cancel.mockResolvedValue(mockSale);

      // Act
      const result = await service.cancel('sale-123', 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(repository.cancel).toHaveBeenCalledWith('sale-123', 'user-1');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SaleCancelledEvent));
    });

    it('should throw NotFoundException if sale does not exist', async () => {
      // Arrange
      repository.cancel.mockRejectedValue(new NotFoundException('Sale nonexistent not found'));

      // Act & Assert
      await expect(service.cancel('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if sale is not completed', async () => {
      // Arrange
      repository.cancel.mockRejectedValue(
        new ConflictException('Sale SALE-20260414-0001 cannot be cancelled: current status is pending'),
      );

      // Act & Assert
      await expect(service.cancel('sale-123', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne (with repository)', () => {
    it('should return a sale by ID', async () => {
      // Arrange
      const mockSale = new Sale(
        'sale-123',
        'SALE-20260414-0001',
        [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 10.5,
            subtotal: 21.0,
            productName: 'Product A',
          },
        ],
        21.0,
        'CASH',
        'COMPLETED',
        new Date(),
      );

      repository.findById.mockResolvedValue(mockSale);

      // Act
      const result = await service.findOne('sale-123');

      // Assert
      expect(result).toBeDefined();
      expect(repository.findById).toHaveBeenCalledWith('sale-123');
    });

    it('should throw NotFoundException if sale not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll (with repository)', () => {
    it('should return all sales', async () => {
      // Arrange
      const mockSales = [
        new Sale(
          'sale-1',
          'SALE-20260414-0001',
          [
            {
              productId: 'prod-1',
              quantity: 2,
              unitPrice: 10.5,
              subtotal: 21.0,
              productName: 'Product A',
            },
          ],
          21.0,
          'CASH',
          'COMPLETED',
          new Date(),
        ),
      ];

      repository.findAll.mockResolvedValue(mockSales);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should filter sales by status', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      await service.findAll({ status: 'completed' });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should filter sales by date range', async () => {
      // Arrange
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-04-30');
      repository.findAll.mockResolvedValue([]);

      // Act
      await service.findAll({ startDate, endDate });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({ startDate, endDate });
    });
  });
});
