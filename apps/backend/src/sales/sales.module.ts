import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesRepository } from './repositories/sales.repository';
import { PrismaModule } from '../database/prisma.module';
import { SyncModule } from '../sync/sync.module';
import { SaleCreatedHandler } from './handlers/sale-created.handler';
import { SaleCancelledHandler } from './handlers/sale-cancelled.handler';
import { CreateSaleHandler, CancelSaleHandler } from './commands/handlers';
import { GetSalesHandler, GetSaleByNumberHandler } from './queries/handlers';

const EventHandlers = [SaleCreatedHandler, SaleCancelledHandler];
const CommandHandlers = [CreateSaleHandler, CancelSaleHandler];
const QueryHandlers = [GetSalesHandler, GetSaleByNumberHandler];

@Module({
  imports: [CqrsModule, PrismaModule, SyncModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    {
      provide: 'ISalesRepository',
      useClass: SalesRepository,
    },
    ...EventHandlers,
    ...CommandHandlers, // CQRS command handlers
    ...QueryHandlers, // CQRS query handlers
  ],
  exports: [SalesService],
})
export class SalesModule {}
