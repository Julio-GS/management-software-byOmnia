import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { ProductCacheInvalidationHandler } from './handlers/product-cache-invalidation.handler';
import { CreateProductHandler, UpdateStockHandler } from './commands/handlers';
import { GetProductsHandler, GetLowStockHandler } from './queries/handlers';
import { PricingModule } from '../pricing/pricing.module';
import { SyncModule } from '../sync/sync.module';
import { InventoryModule } from '../inventory/inventory.module';

const CommandHandlers = [CreateProductHandler, UpdateStockHandler];
const QueryHandlers = [GetProductsHandler, GetLowStockHandler];

@Module({
  imports: [
    CqrsModule, // Required for EventBus and CQRS
    PricingModule,
    SyncModule,
    InventoryModule, // Required for UpdateStockHandler (uses InventoryService)
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository, // Repository abstraction
    ProductCacheInvalidationHandler, // Event handler for cache invalidation
    ...CommandHandlers, // CQRS command handlers
    ...QueryHandlers, // CQRS query handlers
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
