import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SaleCreatedEvent } from '../../shared/events/sale-created.event';
import { SaleCancelledEvent } from '../../shared/events/sale-cancelled.event';
import { PrismaService } from '../../database/prisma.service';
import { Injectable } from '@nestjs/common';

/**
 * DashboardMetricsRefreshHandler
 * 
 * Event handler that refreshes the dashboard_metrics materialized view
 * whenever a sale is created or cancelled.
 * 
 * Uses REFRESH MATERIALIZED VIEW CONCURRENTLY to avoid locking the view
 * during refresh (requires unique index on the view).
 */
@Injectable()
@EventsHandler(SaleCreatedEvent, SaleCancelledEvent)
export class DashboardMetricsRefreshHandler
  implements IEventHandler<SaleCreatedEvent | SaleCancelledEvent>
{
  constructor(private readonly prismaService: PrismaService) {}

  async handle(event: SaleCreatedEvent | SaleCancelledEvent): Promise<void> {
    // Refresh materialized view to reflect new/cancelled sale
    await this.prismaService.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics',
    );
  }
}
