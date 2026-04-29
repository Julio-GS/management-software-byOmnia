import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { SyncModule } from '../sync/sync.module';
import { LotesModule } from '../lotes/lotes.module';

/**
 * InventoryModule - Spanish field names
 * 
 * Manages inventory movements (movimientos_stock) and stock tracking.
 * Uses LotesModule for batch tracking and FEFO.
 */
@Module({
  imports: [
    CqrsModule,
    SyncModule,
    LotesModule, // Required for batch/stock tracking
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
  ],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}