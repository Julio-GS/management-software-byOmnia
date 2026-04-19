import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../../shared/events';

/**
 * ProductCacheInvalidationHandler
 * 
 * Invalidates product cache when products are created, updated, or deleted.
 * Listens to ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent.
 * 
 * Strategy: Clear all keys starting with "products:" pattern.
 */
@EventsHandler(ProductCreatedEvent, ProductUpdatedEvent, ProductDeletedEvent)
export class ProductCacheInvalidationHandler
  implements
    IEventHandler<ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent>
{
  private readonly logger = new Logger(ProductCacheInvalidationHandler.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async handle(
    event: ProductCreatedEvent | ProductUpdatedEvent | ProductDeletedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Invalidating product cache for event: ${event.constructor.name}`,
    );

    try {
      // Get all cache keys
      const store = (this.cacheManager as any).store;
      
      if (store && typeof store.keys === 'function') {
        const keys = await store.keys();
        
        // Filter keys that start with "products:"
        const productKeys = keys.filter((key: string) => key.startsWith('products:'));
        
        // Delete all product cache keys
        for (const key of productKeys) {
          await this.cacheManager.del(key);
        }
        
        this.logger.debug(
          `Invalidated ${productKeys.length} product cache keys`,
        );
      } else {
        this.logger.warn(
          'Cache store does not support keys() method - cache invalidation skipped',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate product cache: ${error.message}`,
        error.stack,
      );
    }
  }
}
