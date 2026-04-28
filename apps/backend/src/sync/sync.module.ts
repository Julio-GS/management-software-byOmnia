import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SyncController } from './sync.controller';
import { BatchPushService } from './services/batch-push.service';
import { PullService } from './services/pull.service';
import { SalesModule } from '../sales/sales.module';
import { PrismaModule } from '../database/prisma.module';

/**
 * SyncModule
 *
 * Responsabilidades:
 *  - batch-push: recibir ventas offline del Electron y procesarlas
 *  - pull: enviar delta de cambios al Electron para actualizar su SQLite
 */
@Module({
  imports: [
    PrismaModule,
    SalesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SyncController],
  providers: [BatchPushService, PullService],
  exports: [BatchPushService, PullService],
})
export class SyncModule {}
