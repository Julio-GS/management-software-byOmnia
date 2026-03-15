import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncGateway } from './sync.gateway';
import {
  ProductCreatedHandler,
  ProductUpdatedHandler,
  ProductDeletedHandler,
  CategoryUpdatedHandler,
  InventoryMovementHandler,
  PricingRecalculatedHandler,
} from './handlers';

const EventHandlers = [
  ProductCreatedHandler,
  ProductUpdatedHandler,
  ProductDeletedHandler,
  CategoryUpdatedHandler,
  InventoryMovementHandler,
  PricingRecalculatedHandler,
];

@Module({
  imports: [
    CqrsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncGateway, ...EventHandlers],
  exports: [SyncService, SyncGateway],
})
export class SyncModule {}
