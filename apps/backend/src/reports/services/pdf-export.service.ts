import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service';
import { ReportsRepository } from '../repositories/reports.repository';
import { ExportReportDto } from '../dto/export-report.dto';

@Injectable()
export class PdfExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsRepository: ReportsRepository,
  ) {}

  /**
   * Main export method: routes to the correct generator by reportType
   * Uses DB views via ReportsRepository (SPEC_05 §1.5.1)
   */
  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    const data = await this.fetchReportData(dto);
    return this.buildPdf(dto, data);
  }

  // -------------------------------------------------------------------
  // Dedicated method for POS sales receipt (not a view-based report)
  // -------------------------------------------------------------------
  async generateSalesReceipt(ventaId: string): Promise<Buffer> {
    const venta = await this.prisma.ventas.findUnique({
      where: { id: ventaId },
      include: {
        detalle_ventas: { include: { productos: true } },
      },
    });

    if (!venta) throw new NotFoundException(`Venta ${ventaId} no encontrada`);

    const doc = new PDFDocument({ margin: 10, size: [226, 800] });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(12).font('Helvetica-Bold').text('SUPERMERCADO OMNIA', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text('Av. Siempre Viva 123', { align: 'center' });
    doc.moveDown();
    doc.text(`Ticket: ${venta.numero_ticket}`);
    doc.text(`Fecha: ${venta.fecha.toLocaleString('es-AR')}`);
    doc.moveDown();
    doc.text('CANT x DETALLE', 10, doc.y);
    doc.text('TOTAL', 180, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
    doc.moveDown(0.5);

    let y = doc.y;
    for (const item of venta.detalle_ventas) {
      doc.text(`${item.cantidad} x ${item.productos.detalle.substring(0, 15)}`, 10, y);
      doc.text(`$${Number(item.total).toFixed(2)}`, 150, y, { align: 'right' });
      y += 12;
    }

    doc.y = y;
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold');
    if (Number(venta.descuentos) > 0) {
      doc.text(`Subtotal: $${(Number(venta.total) + Number(venta.descuentos)).toFixed(2)}`, 10, doc.y);
      doc.text(`Desc: -$${Number(venta.descuentos).toFixed(2)}`, 10, doc.y);
    }
    doc.text(`TOTAL: $${Number(venta.total).toFixed(2)}`, 10, doc.y);
    doc.moveDown();
    doc.fontSize(8).font('Helvetica').text('¡Gracias por su compra!', { align: 'center' });
    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
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
        throw new BadRequestException('Tipo de reporte PDF inválido');
    }
  }

  private async buildPdf(dto: ExportReportDto, data: any[]): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    const title = dto.titulo || this.getDefaultTitle(dto.reportType);
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'right' });
    doc.moveDown(2);

    // Table
    this.renderTable(doc, dto.reportType, data);

    // Footer
    doc.fontSize(8).text(
      'Sistema de Gestión byOmnia',
      50,
      doc.page.height - 40,
      { align: 'center' },
    );

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private renderTable(doc: InstanceType<typeof PDFDocument>, reportType: string, data: any[]) {
    const columns = this.getColumnsForReport(reportType);
    if (!columns.length) return;

    const pageWidth = doc.page.width - 100;
    const colWidth = pageWidth / columns.length;

    // Header row
    let y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    columns.forEach((col, i) => {
      doc.text(col.label, 50 + i * colWidth, y, { width: colWidth, align: 'left' });
    });
    y += 20;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
    y += 5;

    // Data rows
    doc.font('Helvetica').fontSize(9);
    for (const row of data) {
      columns.forEach((col, i) => {
        const value = row[col.field] !== undefined && row[col.field] !== null
          ? String(row[col.field])
          : '-';
        doc.text(value, 50 + i * colWidth, y, { width: colWidth, align: 'left' });
      });
      y += 15;

      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
    }
  }

  private getColumnsForReport(reportType: string) {
    const columnsMap: Record<string, Array<{ field: string; label: string }>> = {
      stock_actual: [
        { field: 'codigo', label: 'Código' },
        { field: 'detalle', label: 'Producto' },
        { field: 'stock_total', label: 'Stock' },
        { field: 'stock_minimo', label: 'Mín.' },
        { field: 'stock_bajo', label: '¿Bajo?' },
      ],
      proximos_vencer: [
        { field: 'codigo', label: 'Código' },
        { field: 'detalle', label: 'Producto' },
        { field: 'numero_lote', label: 'Lote' },
        { field: 'fecha_vencimiento', label: 'Vencimiento' },
        { field: 'dias_hasta_vencimiento', label: 'Días' },
        { field: 'cantidad_actual', label: 'Cantidad' },
      ],
      sin_movimiento: [
        { field: 'codigo', label: 'Código' },
        { field: 'detalle', label: 'Producto' },
        { field: 'rubro_nombre', label: 'Rubro' },
        { field: 'stock_actual', label: 'Stock' },
        { field: 'ultima_venta', label: 'Última Venta' },
        { field: 'dias_sin_venta', label: 'Días sin Venta' },
      ],
      promociones_vigentes: [
        { field: 'nombre', label: 'Nombre' },
        { field: 'tipo', label: 'Tipo' },
        { field: 'valor_descuento', label: 'Descuento' },
        { field: 'fecha_inicio', label: 'Inicio' },
        { field: 'fecha_fin', label: 'Fin' },
        { field: 'productos_incluidos', label: 'Productos' },
      ],
      ventas_diarias: [
        { field: 'fecha', label: 'Fecha' },
        { field: 'cantidad_tickets', label: 'Tickets' },
        { field: 'total_vendido', label: 'Total Vendido' },
        { field: 'total_descuentos', label: 'Descuentos' },
        { field: 'ticket_promedio', label: 'Ticket Prom.' },
      ],
      efectividad_promociones: [
        { field: 'promocion_nombre', label: 'Promoción' },
        { field: 'ventas_con_promocion', label: 'Ventas' },
        { field: 'unidades_vendidas', label: 'Unidades' },
        { field: 'revenue_generado', label: 'Revenue' },
        { field: 'descuento_otorgado', label: 'Descuento' },
        { field: 'porcentaje_descuento', label: '% Dsc' },
      ],
    };

    return columnsMap[reportType] || [];
  }

  private getDefaultTitle(reportType: string): string {
    const titles: Record<string, string> = {
      stock_actual: 'Reporte de Stock Actual',
      proximos_vencer: 'Productos Próximos a Vencer',
      sin_movimiento: 'Productos Sin Movimiento',
      promociones_vigentes: 'Promociones Vigentes',
      ventas_diarias: 'Resumen de Ventas Diarias',
      efectividad_promociones: 'Efectividad de Promociones',
    };
    return titles[reportType] || 'Reporte';
  }
}
