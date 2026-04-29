import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DevolucionesController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesRepository } from './repositories/devoluciones.repository';
import { PrismaModule } from '../database/prisma.module';
import { DevolucionValidator } from './validators/devolucion.validator';
import { RefundCalculatorService } from './services/refund-calculator.service';
import { ProcesarDevolucionHandler } from './handlers/procesar-devolucion.handler';

/**
 * DevolucionesModule - Module for product returns/refunds
 * 
 * Features:
 * - Create devoluciones with business rule validation
 * - Query devoluciones with filters and pagination
 * - Return products to same lote
 * - Calculate refund amount with discount applied
 * - Create movimiento_stock for stock tracking
 * - Emit events for sync module
 * 
 * Dependencies:
 * - PrismaModule: Database access
 * - CqrsModule: Event bus for DevolucionCreatedEvent
 * - AuthModule: JWT guards and role-based access (imported via controller guards)
 */
@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [DevolucionesController],
  providers: [
    DevolucionesService,
    DevolucionesRepository,
    DevolucionValidator,
    RefundCalculatorService,
    ProcesarDevolucionHandler,
  ],
  exports: [DevolucionesService, DevolucionesRepository],
})
export class DevolucionesModule {}
