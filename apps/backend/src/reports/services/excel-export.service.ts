import { Injectable, BadRequestException } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { ReportsRepository } from '../repositories/reports.repository';
import { ExportReportDto } from '../dto/export-report.dto';

@Injectable()
export class ExcelExportService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  /**
   * Main export method: routes to the correct generator by reportType
   * Uses DB views via ReportsRepository (SPEC_05 §1.5.2)
   */
  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    const data = await this.fetchReportData(dto);
    return this.buildExcel(dto, data);
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private async fetchReportData(dto: ExportReportDto): Promise<any[]> {
    const filters = dto.filters || {};
    switch (dto.reportType) {
      case 'stock_actual':
        return this.reportsRepository.getStockActual(filters) as Promise<any[]>;
      case 'proximos_vencer':
        return this.reportsRepository.getProximosVencer(filters) as Promise<any[]>;
      case 'sin_movimiento':
        return this.reportsRepository.getSinMovimiento(filters) as Promise<any[]>;
      case 'promociones_vigentes':
        return this.reportsRepository.getPromocionesVigentes() as Promise<any[]>;
      case 'ventas_diarias':
        return this.reportsRepository.getVentasDiarias(filters) as Promise<any[]>;
      case 'efectividad_promociones':
        return this.reportsRepository.getEfectividadPromociones(filters) as Promise<any[]>;
      default:
        throw new BadRequestException('Tipo de reporte Excel inválido');
    }
  }

  private async buildExcel(dto: ExportReportDto, data: any[]): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'byOmnia';
    workbook.created = new Date();

    const sheetName = dto.titulo || this.getDefaultTitle(dto.reportType);
    const worksheet = workbook.addWorksheet(sheetName);

    const columns = this.getColumnsForReport(dto.reportType);
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.field,
      width: col.width || 20,
    }));

    // Style header row
    this.styleHeader(worksheet);

    // Data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Auto-filter
    if (columns.length > 0) {
      const lastCol = String.fromCharCode(64 + columns.length);
      worksheet.autoFilter = { from: 'A1', to: `${lastCol}1` };
    }

    // Footer timestamp
    const lastRow = worksheet.rowCount + 2;
    const footerCell = worksheet.getCell(`A${lastRow}`);
    footerCell.value = `Generado: ${new Date().toLocaleString('es-AR')} — Sistema byOmnia`;
    footerCell.font = { italic: true, size: 9 };

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private styleHeader(worksheet: Worksheet) {
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    } as any;
  }

  private getColumnsForReport(reportType: string) {
    const columnsMap: Record<string, Array<{ field: string; label: string; width?: number }>> = {
      stock_actual: [
        { field: 'codigo', label: 'Código', width: 15 },
        { field: 'detalle', label: 'Producto', width: 40 },
        { field: 'stock_total', label: 'Stock Total', width: 12 },
        { field: 'lotes_activos', label: 'Lotes Activos', width: 12 },
        { field: 'proximo_vencimiento', label: 'Próx. Venc.', width: 18 },
        { field: 'stock_bajo', label: 'Stock Bajo', width: 12 },
        { field: 'stock_minimo', label: 'Stock Mín.', width: 12 },
      ],
      proximos_vencer: [
        { field: 'codigo', label: 'Código', width: 15 },
        { field: 'detalle', label: 'Producto', width: 40 },
        { field: 'rubro_nombre', label: 'Rubro', width: 20 },
        { field: 'numero_lote', label: 'Lote', width: 15 },
        { field: 'fecha_vencimiento', label: 'Vencimiento', width: 15 },
        { field: 'cantidad_actual', label: 'Cantidad', width: 10 },
        { field: 'dias_hasta_vencimiento', label: 'Días', width: 8 },
      ],
      sin_movimiento: [
        { field: 'codigo', label: 'Código', width: 15 },
        { field: 'detalle', label: 'Producto', width: 40 },
        { field: 'rubro_nombre', label: 'Rubro', width: 20 },
        { field: 'stock_actual', label: 'Stock', width: 10 },
        { field: 'precio_venta', label: 'Precio', width: 12 },
        { field: 'ultima_venta', label: 'Última Venta', width: 18 },
        { field: 'dias_sin_venta', label: 'Días sin Venta', width: 14 },
      ],
      promociones_vigentes: [
        { field: 'nombre', label: 'Nombre', width: 30 },
        { field: 'tipo', label: 'Tipo', width: 25 },
        { field: 'valor_descuento', label: 'Descuento', width: 12 },
        { field: 'acumulable', label: 'Acumulable', width: 12 },
        { field: 'fecha_inicio', label: 'Inicio', width: 15 },
        { field: 'fecha_fin', label: 'Fin', width: 15 },
        { field: 'productos_incluidos', label: 'Productos', width: 12 },
        { field: 'prioridad', label: 'Prioridad', width: 10 },
      ],
      ventas_diarias: [
        { field: 'fecha', label: 'Fecha', width: 12 },
        { field: 'cantidad_tickets', label: 'Tickets', width: 10 },
        { field: 'total_vendido', label: 'Total Vendido', width: 15 },
        { field: 'total_descuentos', label: 'Descuentos', width: 15 },
        { field: 'ticket_promedio', label: 'Ticket Promedio', width: 15 },
        { field: 'total_efectivo', label: 'Efectivo', width: 12 },
        { field: 'total_debito', label: 'Débito', width: 12 },
        { field: 'total_credito', label: 'Crédito', width: 12 },
        { field: 'total_transferencia', label: 'Transferencia', width: 14 },
        { field: 'total_qr', label: 'QR', width: 10 },
      ],
      efectividad_promociones: [
        { field: 'promocion_nombre', label: 'Promoción', width: 30 },
        { field: 'promocion_tipo', label: 'Tipo', width: 25 },
        { field: 'fecha_inicio', label: 'Inicio', width: 15 },
        { field: 'fecha_fin', label: 'Fin', width: 15 },
        { field: 'ventas_con_promocion', label: 'Ventas', width: 10 },
        { field: 'unidades_vendidas', label: 'Unidades', width: 12 },
        { field: 'revenue_generado', label: 'Revenue', width: 15 },
        { field: 'descuento_otorgado', label: 'Desc. Otorgado', width: 15 },
        { field: 'ticket_promedio', label: 'Ticket Prom.', width: 14 },
        { field: 'porcentaje_descuento', label: '% Desc.', width: 10 },
      ],
    };

    return columnsMap[reportType] || [];
  }

  private getDefaultTitle(reportType: string): string {
    const titles: Record<string, string> = {
      stock_actual: 'Stock Actual',
      proximos_vencer: 'Próximos a Vencer',
      sin_movimiento: 'Sin Movimiento',
      promociones_vigentes: 'Promociones Vigentes',
      ventas_diarias: 'Ventas Diarias',
      efectividad_promociones: 'Efectividad Promociones',
    };
    return titles[reportType] || 'Reporte';
  }
}
