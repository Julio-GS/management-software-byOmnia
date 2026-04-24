import { Module } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { LotesRepository } from './repositories/lotes.repository';
import { FefoAlgorithmService } from './services/fefo-algorithm.service';

/**
 * LotesModule - Batch tracking module
 * 
 * Manages lotes (batches) with FEFO algorithm.
 */
@Module({
  controllers: [LotesController],
  providers: [LotesService, LotesRepository, FefoAlgorithmService],
  exports: [LotesService, LotesRepository, FefoAlgorithmService],
})
export class LotesModule {}