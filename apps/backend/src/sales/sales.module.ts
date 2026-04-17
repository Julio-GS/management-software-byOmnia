import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesRepository } from './repositories/sales.repository';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    {
      provide: 'ISalesRepository',
      useClass: SalesRepository,
    },
  ],
  exports: [SalesService],
})
export class SalesModule {}
