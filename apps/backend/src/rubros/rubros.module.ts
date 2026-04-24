import { Module } from '@nestjs/common';
import { RubrosController } from './rubros.controller';
import { RubrosService } from './rubros.service';
import { RubrosRepository } from './repositories/rubros.repository';

@Module({
  controllers: [RubrosController],
  providers: [RubrosService, RubrosRepository],
  exports: [RubrosService],
})
export class RubrosModule {}