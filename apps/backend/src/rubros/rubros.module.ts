import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RubrosController } from './rubros.controller';
import { RubrosService } from './rubros.service';
import { RubrosRepository } from './repositories/rubros.repository';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [CqrsModule, PricingModule],
  controllers: [RubrosController],
  providers: [RubrosService, RubrosRepository],
  exports: [RubrosService],
})
export class RubrosModule {}