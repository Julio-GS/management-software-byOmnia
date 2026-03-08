import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { PricingModule } from '../pricing/pricing.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    CqrsModule, // Required for EventBus
    PricingModule,
    forwardRef(() => SyncModule),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository, // Repository abstraction
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
