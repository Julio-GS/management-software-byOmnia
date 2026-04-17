import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SaleCreatedEvent, SaleCancelledEvent } from '../../shared/events';

/**
 * DashboardCacheInvalidationHandler
 * 
 * Invalidates dashboard metrics cache when sales are created or cancelled.
 * Listens to SaleCreatedEvent and SaleCancelledEvent.
 * 
 * Strategy: Clear "dashboard:metrics" key on any sale change.
 */
@EventsHandler(SaleCreatedEvent, SaleCancelledEvent)
export class DashboardCacheInvalidationHandler
  implements IEventHandler<SaleCreatedEvent | SaleCancelledEvent>
{
  private readonly logger = new Logger(DashboardCacheInvalidationHandler.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async handle(event: SaleCreatedEvent | SaleCancelledEvent): Promise<void> {
    this.logger.debug(
      `Invalidating dashboard cache for event: ${event.constructor.name}`,
    );

    try {
      await this.cacheManager.del('dashboard:metrics');
      this.logger.debug('Dashboard cache invalidated successfully');
    } catch (error) {
      this.logger.error(
        `Failed to invalidate dashboard cache: ${error.message}`,
        error.stack,
      );
    }
  }
}
