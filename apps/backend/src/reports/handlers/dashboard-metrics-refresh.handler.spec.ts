import { Test, TestingModule } from '@nestjs/testing';
import { DashboardMetricsRefreshHandler } from './dashboard-metrics-refresh.handler';
import { SaleCreatedEvent } from '../../shared/events/sale-created.event';
import { SaleCancelledEvent } from '../../shared/events/sale-cancelled.event';
import { PrismaService } from '../../database/prisma.service';

describe('DashboardMetricsRefreshHandler', () => {
  let handler: DashboardMetricsRefreshHandler;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $executeRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardMetricsRefreshHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    handler = module.get<DashboardMetricsRefreshHandler>(
      DashboardMetricsRefreshHandler,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handle SaleCreatedEvent', () => {
    it('should refresh materialized view when sale is created', async () => {
      // Arrange
      const event = new SaleCreatedEvent(
        'sale-id-123',
        'SALE-001',
        100.5,
        [
          {
            productId: 'prod-1',
            quantity: 2,
            price: 50.25,
            subtotal: 100.5,
          },
        ],
        'card',
        new Date(),
        'user-id-1',
      );

      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics',
      );
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    });
  });

  describe('handle SaleCancelledEvent', () => {
    it('should refresh materialized view when sale is cancelled', async () => {
      // Arrange
      const event = new SaleCancelledEvent(
        'sale-id-123',
        'Cancelled by customer',
        new Date(),
        'user-id-1',
      );

      mockPrismaService.$executeRawUnsafe.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics',
      );
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    });
  });
});
