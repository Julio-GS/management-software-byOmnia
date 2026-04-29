import { Module } from '@nestjs/common';
import { CierresCajaService } from './cierres-caja.service';
import { CierresCajaController } from './cierres-caja.controller';
import { CierresCajaRepository } from './repositories/cierres-caja.repository';
import { PrismaModule } from '../database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [CierresCajaController],
  providers: [CierresCajaService, CierresCajaRepository],
  exports: [CierresCajaService],
})
export class CierresCajaModule {}
