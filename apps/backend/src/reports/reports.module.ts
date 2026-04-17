import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { DashboardCacheInvalidationHandler } from './handlers/dashboard-cache-invalidation.handler';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    DashboardCacheInvalidationHandler,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
