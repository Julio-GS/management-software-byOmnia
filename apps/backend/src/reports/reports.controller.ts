import { Controller, Get, Post, Query, Body, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PdfExportService } from './services/pdf-export.service';
import { ExcelExportService } from './services/excel-export.service';
import { ExportReportDto } from './dto/export-report.dto';
import { QueryStockActualDto } from './dto/query-stock-actual.dto';
import { QueryProximosVencerDto } from './dto/query-proximos-vencer.dto';
import { QuerySinMovimientoDto } from './dto/query-sin-movimiento.dto';
import { QueryVentasDiariasDto } from './dto/query-ventas-diarias.dto';
import { QueryEfectividadPromocionesDto } from './dto/query-efectividad-promociones.dto';
import { UserRole } from '../auth/enums/user-role.enum';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfExportService: PdfExportService,
    private readonly excelExportService: ExcelExportService,
  ) {}

  // ------------------------------------------------------------------
  // GET endpoints — 6 DB Views (SPEC_05 §1.1)
  // ------------------------------------------------------------------

  @Get('stock-actual')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.CAJERO)
  async getStockActual(@Query() query: QueryStockActualDto) {
    return this.reportsService.getStockActual(query);
  }

  @Get('productos-proximos-vencer')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.CAJERO)
  async getProximosVencer(@Query() query: QueryProximosVencerDto) {
    return this.reportsService.getProximosVencer(query);
  }

  @Get('productos-sin-movimiento')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getSinMovimiento(@Query() query: QuerySinMovimientoDto) {
    return this.reportsService.getSinMovimiento(query);
  }

  @Get('promociones-vigentes')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.CAJERO)
  async getPromocionesVigentes() {
    return this.reportsService.getPromocionesVigentes();
  }

  @Get('ventas-diarias')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getVentasDiarias(@Query() query: QueryVentasDiariasDto) {
    return this.reportsService.getVentasDiarias(query);
  }

  @Get('efectividad-promociones')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getEfectividadPromociones(@Query() query: QueryEfectividadPromocionesDto) {
    return this.reportsService.getEfectividadPromociones(query);
  }

  @Get('sales-trends')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getSalesTrends(@Query('days') days?: number) {
    return this.reportsService.getSalesTrends(days || 7);
  }

  // ------------------------------------------------------------------
  // POST /export-pdf  (SPEC_05 §1.5.1)
  // ------------------------------------------------------------------

  @Post('export-pdf')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.CAJERO)
  async exportPdf(@Body() dto: ExportReportDto, @Res() res: Response) {
    let buffer: Buffer;
    let filename: string;

    if (dto.reportType === 'sales_receipt') {
      // POS-specific: generate ticket for a given ventaId
      if (!dto.ventaId) {
        throw new BadRequestException('ventaId es requerido para sales_receipt');
      }
      buffer = await this.pdfExportService.generateSalesReceipt(dto.ventaId);
      filename = `ticket-${dto.ventaId.substring(0, 8)}.pdf`;
    } else {
      // View-based reports
      buffer = await this.pdfExportService.exportReport(dto);
      filename = `${dto.reportType.replace(/_/g, '-')}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  // ------------------------------------------------------------------
  // POST /export-excel  (SPEC_05 §1.5.2)
  // ------------------------------------------------------------------

  @Post('export-excel')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async exportExcel(@Body() dto: ExportReportDto, @Res() res: Response) {
    if (dto.reportType === 'sales_receipt') {
      throw new BadRequestException('sales_receipt no está disponible en formato Excel');
    }

    const buffer = await this.excelExportService.exportReport(dto);
    const filename = `${dto.reportType.replace(/_/g, '-')}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
