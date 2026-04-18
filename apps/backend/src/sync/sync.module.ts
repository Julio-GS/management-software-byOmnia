import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncGateway } from './sync.gateway';
import { WebSocketNotificationService } from './services/websocket-notification.service';
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
  providers: [
    SyncService,
    SyncGateway,
    WebSocketNotificationService,
    {
      provide: 'NOTIFICATION_SERVICE',
      useClass: WebSocketNotificationService,
    },
    ...EventHandlers,
  ],
  exports: [SyncService, SyncGateway, 'NOTIFICATION_SERVICE'],
})
export class SyncModule {}
