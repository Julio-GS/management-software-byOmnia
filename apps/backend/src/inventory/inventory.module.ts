import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { SyncModule } from '../sync/sync.module';

/**
 * InventoryModule
 * 
 * Manages inventory movements and stock tracking.
 * Uses CQRS for event-driven architecture.
 */
@Module({
  imports: [
    CqrsModule,
    SyncModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
