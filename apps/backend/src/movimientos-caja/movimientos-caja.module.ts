import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MovimientosCajaService } from './movimientos-caja.service';
import { MovimientosCajaController } from './movimientos-caja.controller';
import { MovimientosCajaRepository } from './repositories/movimientos-caja.repository';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [MovimientosCajaController],
  providers: [MovimientosCajaService, MovimientosCajaRepository],
  exports: [MovimientosCajaService],
})
export class MovimientosCajaModule {}
