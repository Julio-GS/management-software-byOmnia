import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PricingRepository } from './repositories/pricing.repository';
import { PrismaModule } from '../database/prisma.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    PrismaModule,
    CqrsModule,
    forwardRef(() => SyncModule),
  ],
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
  ],
  exports: [PricingService],
})
export class PricingModule {}
