import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesRepository } from './repositories/sales.repository';
import { PrismaModule } from '../database/prisma.module';
import { PromocionesModule } from '../promociones/promociones.module';

@Module({
  imports: [CqrsModule, PrismaModule, PromocionesModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService],
})
export class SalesModule {}
