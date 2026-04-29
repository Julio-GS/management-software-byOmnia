import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CajasService } from './cajas.service';
import { CajasController } from './cajas.controller';
import { CajasRepository } from './repositories/cajas.repository';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [CajasController],
  providers: [CajasService, CajasRepository],
  exports: [CajasService],
})
export class CajasModule {}
