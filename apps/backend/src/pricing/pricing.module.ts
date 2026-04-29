import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PricingRepository } from './repositories/pricing.repository';
import { MarkupCalculatorService } from './services/markup-calculator.service';
import { PrismaModule } from '../database/prisma.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    PrismaModule,
    CqrsModule,
    SyncModule,
  ],
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
    MarkupCalculatorService,
  ],
  exports: [PricingService, MarkupCalculatorService],
})
export class PricingModule {}
