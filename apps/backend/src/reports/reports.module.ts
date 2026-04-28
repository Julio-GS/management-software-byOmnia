import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { DashboardCacheInvalidationHandler } from './handlers/dashboard-cache-invalidation.handler';
import { DashboardMetricsRefreshHandler } from './handlers/dashboard-metrics-refresh.handler';
import { PrismaModule } from '../database/prisma.module';
import { PdfExportService } from './services/pdf-export.service';
import { ExcelExportService } from './services/excel-export.service';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    DashboardCacheInvalidationHandler,
    DashboardMetricsRefreshHandler,
    PdfExportService,
    ExcelExportService,
  ],
  exports: [ReportsService, PdfExportService, ExcelExportService],
})
export class ReportsModule {}
