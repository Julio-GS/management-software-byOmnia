import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './repositories/categories.repository';
import { PricingModule } from '../pricing/pricing.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    CqrsModule,
    PricingModule,
    SyncModule,
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesRepository,
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
