import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/**
 * OmniaCacheModule
 * 
 * Provides in-memory caching for read-heavy data (dashboard metrics, product list).
 * Configuration:
 * - TTL: 300000ms (5 minutes default)
 * - Max items: 100
 * - Store: In-memory (cache resets on server restart)
 * 
 * Usage:
 * - Inject CACHE_MANAGER from '@nestjs/cache-manager'
 * - Use cache.get(), cache.set(), cache.reset()
 */
@Module({
  imports: [
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 100, // Maximum number of items in cache
      isGlobal: true, // Make cache available globally
    }),
  ],
  exports: [CacheModule],
})
export class OmniaCacheModule {}
