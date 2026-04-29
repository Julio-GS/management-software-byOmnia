import { Module } from '@nestjs/common';
import { UnidadesMedidaController } from './unidades-medida.controller';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadesMedidaRepository } from './repositories/unidades-medida.repository';

@Module({
  controllers: [UnidadesMedidaController],
  providers: [UnidadesMedidaService, UnidadesMedidaRepository],
  exports: [UnidadesMedidaService],
})
export class UnidadesMedidaModule {}