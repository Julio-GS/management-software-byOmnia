import { Module } from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { PromocionesController } from './promociones.controller';
import { PromocionesRepository } from './repositories/promociones.repository';
import { PromotionCalculatorService } from './services/promotion-calculator.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromocionesController],
  providers: [
    PromocionesService,
    PromocionesRepository,
    PromotionCalculatorService,
  ],
  exports: [PromocionesService, PromotionCalculatorService],
})
export class PromocionesModule {}