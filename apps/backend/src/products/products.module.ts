import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsEsService } from './products-es.service';
import { ProductsController } from './products.controller';
import { ProductosRepository } from './repositories/productos.repository';
import { ProductCacheInvalidationHandler } from './handlers/product-cache-invalidation.handler';
import { CreateProductHandler, UpdateStockHandler } from './commands/handlers';
import { GetProductsHandler, GetLowStockHandler } from './queries/handlers';
import { PricingModule } from '../pricing/pricing.module';
import { SyncModule } from '../sync/sync.module';
import { InventoryModule } from '../inventory/inventory.module';
import { LotesModule } from '../lotes/lotes.module';

const CommandHandlers = [CreateProductHandler, UpdateStockHandler];
const QueryHandlers = [GetProductsHandler, GetLowStockHandler];

/**
 * ProductsModule - Spanish field names (productos)
 * 
 * Manages productos (products) with full inventory integration.
 * Uses LotesModule for stock tracking and FEFO algorithm.
 */
@Module({
  imports: [
    CqrsModule, // Required for EventBus and CQRS
    PricingModule,
    SyncModule,
    InventoryModule, // Required for stock management
    LotesModule, // Required for batch tracking
  ],
  controllers: [ProductsController],
  providers: [
    ProductsEsService,
    // Alias for backward compatibility
    { provide: 'ProductsService', useExisting: ProductsEsService },
    ProductosRepository, // Spanish field names repository
    ProductCacheInvalidationHandler, // Event handler for cache invalidation
    ...CommandHandlers, // CQRS command handlers
    ...QueryHandlers, // CQRS query handlers
  ],
  exports: [ProductsEsService, 'ProductsService'],
})
export class ProductsModule {}