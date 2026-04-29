# SPEC_05_REPORTS - Backend Refactor
## ReportsModule

**Project:** management-software-byomnia  
**Phase:** SPEC (Specifications)  
**Modules:** 1 Reports Module  
**Approach:** Clean Slate  
**Dependencies:** SharedModule, AuthModule, PrismaModule

---

## TABLE OF CONTENTS

1. [ReportsModule](#1-reportsmodule)
   - API Contracts
   - DTOs
   - Business Rules (6 DB Views)
   - Repository Queries
   - Export Engines (PDF, Excel)
   - Data Purge System
   - Tests
   - Guards

---

## 1. REPORTSMODULE

### 1.1 API Contracts

```typescript
// GET /reports/stock-actual?stock_bajo=true
// GET /reports/productos-proximos-vencer?dias=15
// GET /reports/productos-sin-movimiento?dias=30
// GET /reports/promociones-vigentes
// GET /reports/ventas-diarias?fecha_desde=2026-04-01&fecha_hasta=2026-04-20
// GET /reports/efectividad-promociones?promocion_id=uuid
// POST /reports/export-pdf (body: { reportType, filters })
// POST /reports/export-excel (body: { reportType, filters })
// DELETE /reports/purge-ventas (query: { fecha_limite })
```

**Roles:**
- `GET`: encargado, admin
- `POST (exports)`: encargado, admin
- `DELETE (purge)`: admin ONLY

### 1.2 Key DTOs

```typescript
// query-stock-actual.dto.ts
export class QueryStockActualDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  stock_bajo?: boolean; // Filtrar solo productos con stock bajo
}

// query-proximos-vencer.dto.ts
export class QueryProximosVencerDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(90)
  dias?: number = 15; // Default: 15 días
}

// query-sin-movimiento.dto.ts
export class QuerySinMovimientoDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(365)
  dias?: number = 30; // Default: 30 días
}

// query-ventas-diarias.dto.ts
export class QueryVentasDiariasDto {
  @IsOptional()
  @IsDateString()
  fecha_desde?: string; // ISO 8601: 2026-04-01

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string; // ISO 8601: 2026-04-20

  @IsOptional()
  @IsIn(['efectivo', 'debito', 'credito', 'transferencia', 'qr'])
  medio_pago?: string; // Filtrar por medio de pago específico
}

// query-efectividad-promociones.dto.ts
export class QueryEfectividadPromocionesDto {
  @IsOptional()
  @IsUUID()
  promocion_id?: string; // Filtrar una promoción específica

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}

// export-report.dto.ts
export class ExportReportDto {
  @IsString()
  @IsIn([
    'stock_actual',
    'proximos_vencer',
    'sin_movimiento',
    'promociones_vigentes',
    'ventas_diarias',
    'efectividad_promociones',
  ])
  reportType: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>; // Filtros dinámicos según tipo de reporte

  @IsOptional()
  @IsString()
  @MaxLength(100)
  titulo?: string; // Título personalizado para el reporte
}

// purge-ventas.dto.ts
export class PurgeVentasDto {
  @IsDateString()
  @IsNotEmpty()
  fecha_limite: string; // Solo ventas ANTES de esta fecha (ej: 2026-03-20)

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  dry_run?: boolean = true; // Default: simulación, no borrar realmente
}
```

### 1.3 Business Rules (6 DB Views)

#### 1.3.1 v_stock_actual
- **Propósito:** Stock consolidado por producto (suma de todos los lotes activos)
- **Campos clave:**
  - `producto_id`, `codigo`, `detalle`
  - `stock_total`: SUM(cantidad_actual) de lotes activos
  - `lotes_activos`: COUNT de lotes con cantidad > 0
  - `proximo_vencimiento`: MIN(fecha_vencimiento) de lotes activos
  - `stock_bajo`: TRUE si stock_total <= stock_minimo
- **Filtros:** Solo productos con `maneja_stock = true` y `activo = true`
- **Índice:** productos(maneja_stock, activo), lotes(producto_id, activo)

#### 1.3.2 v_productos_proximos_vencer
- **Propósito:** Alertas de lotes próximos a vencer (15 días default, configurable)
- **Campos clave:**
  - `codigo`, `detalle`, `rubro_nombre`
  - `numero_lote`, `fecha_vencimiento`, `cantidad_actual`
  - `dias_hasta_vencimiento`: fecha_vencimiento - CURRENT_DATE
- **Filtros:** 
  - `lotes.activo = true`
  - `cantidad_actual > 0`
  - `fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL 'X days'`
- **Orden:** `fecha_vencimiento ASC` (primero los que vencen antes)
- **Alerta automática:** Enviar email + notificación in-app a encargado/admin

#### 1.3.3 v_productos_sin_movimiento
- **Propósito:** Dead stock - productos sin ventas en últimos 30 días (configurable)
- **Campos clave:**
  - `producto_id`, `codigo`, `detalle`, `rubro_nombre`
  - `stock_actual`, `precio_venta`
  - `ultima_venta`: MAX(ventas.fecha) de ese producto
  - `dias_sin_venta`: CURRENT_DATE - ultima_venta
- **Filtros:**
  - `maneja_stock = true`, `activo = true`
  - `ultima_venta < CURRENT_DATE - INTERVAL '30 days'` OR `ultima_venta IS NULL`
- **Orden:** `dias_sin_venta DESC NULLS FIRST` (nunca vendidos primero)

#### 1.3.4 v_promociones_vigentes
- **Propósito:** Promociones activas AHORA (fecha, hora, día de semana)
- **Campos clave:**
  - `id`, `nombre`, `tipo`, `valor_descuento`
  - `fecha_inicio`, `fecha_fin`, `hora_inicio`, `hora_fin`, `dias_semana`
  - `productos_incluidos`: COUNT(promociones_productos)
- **Validaciones dinámicas:**
  - `CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin`
  - `CURRENT_TIME BETWEEN hora_inicio AND hora_fin` (si hora_inicio NOT NULL)
  - `EXTRACT(DOW FROM CURRENT_DATE) = ANY(dias_semana)` (si dias_semana NOT NULL)
- **Orden:** `prioridad DESC, fecha_inicio DESC`

#### 1.3.5 v_ventas_diarias
- **Propósito:** Resumen consolidado de ventas por día con breakdown de medios de pago
- **Campos clave:**
  - `fecha`: DATE(ventas.fecha)
  - `cantidad_tickets`: COUNT DISTINCT(ventas.id)
  - `total_vendido`: SUM(ventas.total)
  - `total_descuentos`: SUM(ventas.descuentos)
  - `ticket_promedio`: AVG(ventas.total)
  - `total_efectivo`, `total_debito`, `total_credito`, `total_transferencia`, `total_qr`
- **Filtros:** `ventas.anulada = false`
- **Orden:** `fecha DESC`

#### 1.3.6 v_efectividad_promociones
- **Propósito:** Métricas de performance de promociones (ROI, descuentos otorgados)
- **Campos clave:**
  - `promocion_id`, `promocion_nombre`, `promocion_tipo`
  - `fecha_inicio`, `fecha_fin`
  - `ventas_con_promocion`: COUNT DISTINCT(detalle_ventas.venta_id)
  - `unidades_vendidas`: SUM(detalle_ventas.cantidad)
  - `revenue_generado`: SUM(detalle_ventas.total)
  - `descuento_otorgado`: SUM(detalle_ventas.descuento)
  - `ticket_promedio`: AVG(detalle_ventas.total)
- **Filtros:** `ventas.anulada = false`
- **Orden:** `revenue_generado DESC`

### 1.4 Repository Queries

```typescript
// reports.repository.ts

// GET stock actual (desde vista v_stock_actual)
async getStockActual(query: QueryStockActualDto) {
  return prisma.$queryRaw`
    SELECT 
      producto_id,
      codigo,
      detalle,
      stock_total,
      lotes_activos,
      proximo_vencimiento,
      stock_bajo,
      stock_minimo
    FROM v_stock_actual
    WHERE (${query.stock_bajo}::boolean IS NULL OR stock_bajo = ${query.stock_bajo})
    ORDER BY stock_total ASC, detalle ASC
  `;
}

// GET productos próximos a vencer (vista dinámica)
async getProximosVencer(query: QueryProximosVencerDto) {
  const dias = query.dias ?? 15;

  return prisma.$queryRaw`
    SELECT 
      codigo,
      detalle,
      rubro_nombre,
      numero_lote,
      fecha_vencimiento,
      cantidad_actual,
      dias_hasta_vencimiento
    FROM v_productos_proximos_vencer
    WHERE dias_hasta_vencimiento <= ${dias}
    ORDER BY dias_hasta_vencimiento ASC
  `;
}

// GET productos sin movimiento (vista dinámica)
async getSinMovimiento(query: QuerySinMovimientoDto) {
  const dias = query.dias ?? 30;

  return prisma.$queryRaw`
    SELECT 
      producto_id,
      codigo,
      detalle,
      rubro_nombre,
      stock_actual,
      precio_venta,
      ultima_venta,
      dias_sin_venta
    FROM v_productos_sin_movimiento
    WHERE dias_sin_venta >= ${dias}
    ORDER BY dias_sin_venta DESC NULLS FIRST
  `;
}

// GET promociones vigentes (desde vista)
async getPromocionesVigentes() {
  return prisma.$queryRaw`
    SELECT 
      id,
      nombre,
      tipo,
      valor_descuento,
      acumulable,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      dias_semana,
      cantidad_maxima_cliente,
      productos_incluidos
    FROM v_promociones_vigentes
    ORDER BY prioridad DESC, fecha_inicio DESC
  `;
}

// GET ventas diarias con filtros
async getVentasDiarias(query: QueryVentasDiariasDto) {
  const where = [];
  
  if (query.fecha_desde) {
    where.push(`fecha >= '${query.fecha_desde}'::date`);
  }
  if (query.fecha_hasta) {
    where.push(`fecha <= '${query.fecha_hasta}'::date`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return prisma.$queryRaw`
    SELECT 
      fecha,
      cantidad_tickets,
      cantidad_transacciones,
      total_vendido,
      total_descuentos,
      ticket_promedio,
      total_efectivo,
      total_debito,
      total_credito,
      total_transferencia,
      total_qr
    FROM v_ventas_diarias
    ${whereClause ? Prisma.raw(whereClause) : Prisma.empty}
    ORDER BY fecha DESC
  `;
}

// GET efectividad promociones con filtros
async getEfectividadPromociones(query: QueryEfectividadPromocionesDto) {
  const where = [];

  if (query.promocion_id) {
    where.push(`promocion_id = '${query.promocion_id}'::uuid`);
  }
  if (query.fecha_desde) {
    where.push(`fecha_inicio >= '${query.fecha_desde}'::date`);
  }
  if (query.fecha_hasta) {
    where.push(`fecha_fin <= '${query.fecha_hasta}'::date`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return prisma.$queryRaw`
    SELECT 
      promocion_id,
      promocion_nombre,
      promocion_tipo,
      fecha_inicio,
      fecha_fin,
      ventas_con_promocion,
      unidades_vendidas,
      revenue_generado,
      descuento_otorgado,
      ticket_promedio,
      ROUND((descuento_otorgado / NULLIF(revenue_generado, 0) * 100)::numeric, 2) AS porcentaje_descuento
    FROM v_efectividad_promociones
    ${whereClause ? Prisma.raw(whereClause) : Prisma.empty}
    ORDER BY revenue_generado DESC
  `;
}
```

### 1.5 Export Engines

#### 1.5.1 PDF Export (pdfkit)

```typescript
// export-pdf.service.ts
import PDFDocument from 'pdfkit';
import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './repositories/reports.repository';
import { ExportReportDto } from './dto/export-report.dto';

@Injectable()
export class ExportPdfService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    // 1. Obtener datos según tipo de reporte
    const data = await this.fetchReportData(dto.reportType, dto.filters);

    // 2. Crear PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // 3. Header
    doc.fontSize(18).text(dto.titulo || this.getDefaultTitle(dto.reportType), {
      align: 'center',
    });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-AR')}`, {
      align: 'right',
    });
    doc.moveDown(2);

    // 4. Tabla dinámica según tipo de reporte
    this.renderTable(doc, dto.reportType, data);

    // 5. Footer
    doc.fontSize(8).text(
      `Página ${doc.bufferedPageRange().count} - Sistema de Gestión byOmnia`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async fetchReportData(reportType: string, filters: any) {
    switch (reportType) {
      case 'stock_actual':
        return this.reportsRepository.getStockActual(filters);
      case 'proximos_vencer':
        return this.reportsRepository.getProximosVencer(filters);
      case 'sin_movimiento':
        return this.reportsRepository.getSinMovimiento(filters);
      case 'promociones_vigentes':
        return this.reportsRepository.getPromocionesVigentes();
      case 'ventas_diarias':
        return this.reportsRepository.getVentasDiarias(filters);
      case 'efectividad_promociones':
        return this.reportsRepository.getEfectividadPromociones(filters);
      default:
        throw new BadRequestException('Tipo de reporte inválido');
    }
  }

  private renderTable(doc: PDFDocument, reportType: string, data: any[]) {
    // Implementación dinámica de tablas según columnas del reporte
    // Ej: para stock_actual: codigo, detalle, stock_total, stock_bajo
    const columns = this.getColumnsForReport(reportType);
    
    // Header de tabla
    let y = doc.y;
    const colWidth = (doc.page.width - 100) / columns.length;

    columns.forEach((col, i) => {
      doc.fontSize(10).font('Helvetica-Bold')
        .text(col.label, 50 + i * colWidth, y, { width: colWidth, align: 'left' });
    });

    y += 20;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
    y += 5;

    // Rows
    data.forEach((row) => {
      columns.forEach((col, i) => {
        doc.fontSize(9).font('Helvetica')
          .text(row[col.field] ?? '-', 50 + i * colWidth, y, { width: colWidth, align: 'left' });
      });
      y += 15;

      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
    });
  }

  private getColumnsForReport(reportType: string) {
    // Mapeo de columnas por tipo de reporte
    const columnsMap = {
      stock_actual: [
        { field: 'codigo', label: 'Código' },
        { field: 'detalle', label: 'Producto' },
        { field: 'stock_total', label: 'Stock' },
        { field: 'stock_bajo', label: 'Bajo' },
      ],
      proximos_vencer: [
        { field: 'codigo', label: 'Código' },
        { field: 'detalle', label: 'Producto' },
        { field: 'numero_lote', label: 'Lote' },
        { field: 'fecha_vencimiento', label: 'Vencimiento' },
        { field: 'dias_hasta_vencimiento', label: 'Días' },
      ],
      // ... resto de columnas
    };

    return columnsMap[reportType] || [];
  }

  private getDefaultTitle(reportType: string): string {
    const titles = {
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
```

#### 1.5.2 Excel Export (exceljs)

```typescript
// export-excel.service.ts
import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { ReportsRepository } from './repositories/reports.repository';
import { ExportReportDto } from './dto/export-report.dto';

@Injectable()
export class ExportExcelService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    // 1. Obtener datos
    const data = await this.fetchReportData(dto.reportType, dto.filters);

    // 2. Crear workbook
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(dto.titulo || 'Reporte');

    // 3. Header de columnas
    const columns = this.getColumnsForReport(dto.reportType);
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.field,
      width: col.width || 20,
    }));

    // 4. Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // 5. Agregar datos
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // 6. Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(64 + columns.length)}1`,
    };

    // 7. Footer con timestamp
    const lastRow = worksheet.rowCount + 2;
    worksheet.getCell(`A${lastRow}`).value = `Generado: ${new Date().toLocaleString('es-AR')}`;
    worksheet.getCell(`A${lastRow}`).font = { italic: true, size: 9 };

    // 8. Convertir a Buffer
    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private async fetchReportData(reportType: string, filters: any) {
    // Mismo método que PDF
    switch (reportType) {
      case 'stock_actual':
        return this.reportsRepository.getStockActual(filters);
      case 'proximos_vencer':
        return this.reportsRepository.getProximosVencer(filters);
      case 'sin_movimiento':
        return this.reportsRepository.getSinMovimiento(filters);
      case 'promociones_vigentes':
        return this.reportsRepository.getPromocionesVigentes();
      case 'ventas_diarias':
        return this.reportsRepository.getVentasDiarias(filters);
      case 'efectividad_promociones':
        return this.reportsRepository.getEfectividadPromociones(filters);
      default:
        throw new BadRequestException('Tipo de reporte inválido');
    }
  }

  private getColumnsForReport(reportType: string) {
    const columnsMap = {
      stock_actual: [
        { field: 'codigo', label: 'Código', width: 15 },
        { field: 'detalle', label: 'Producto', width: 40 },
        { field: 'stock_total', label: 'Stock Total', width: 12 },
        { field: 'lotes_activos', label: 'Lotes Activos', width: 12 },
        { field: 'stock_bajo', label: 'Stock Bajo', width: 12 },
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
      ],
      // ... resto de mapeos
    };

    return columnsMap[reportType] || [];
  }
}
```

### 1.6 Data Purge System

```typescript
// data-purge.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PurgeVentasDto } from './dto/purge-ventas.dto';

@Injectable()
export class DataPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CRÍTICO: Solo purga VENTAS manuales, NO automático
   * Mantiene integridad referencial
   */
  async purgeVentas(dto: PurgeVentasDto, userId: string) {
    const fechaLimite = new Date(dto.fecha_limite);
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);

    // Validación: Mínimo 1 mes de antigüedad
    if (fechaLimite > unMesAtras) {
      throw new ForbiddenException(
        'Solo se pueden purgar ventas con más de 1 mes de antigüedad'
      );
    }

    // 1. Contar registros afectados
    const ventasCount = await this.prisma.ventas.count({
      where: {
        fecha: { lt: fechaLimite },
        anulada: false, // Solo ventas válidas
      },
    });

    const detalleCount = await this.prisma.detalle_ventas.count({
      where: {
        venta: { fecha: { lt: fechaLimite }, anulada: false },
      },
    });

    const movimientosCount = await this.prisma.movimientos_stock.count({
      where: {
        tipo_movimiento: 'venta',
        fecha: { lt: fechaLimite },
      },
    });

    // 2. Dry run - solo retornar stats
    if (dto.dry_run) {
      return {
        dry_run: true,
        fecha_limite: fechaLimite,
        registros_a_eliminar: {
          ventas: ventasCount,
          detalle_ventas: detalleCount,
          movimientos_stock: movimientosCount,
        },
        warning: 'Esta es una simulación. Use dry_run=false para ejecutar.',
      };
    }

    // 3. Ejecución real en TRANSACCIÓN
    const result = await this.prisma.$transaction(async (tx) => {
      // 3.1 Eliminar movimientos_stock de tipo venta
      const deletedMovimientos = await tx.movimientos_stock.deleteMany({
        where: {
          tipo_movimiento: 'venta',
          fecha: { lt: fechaLimite },
        },
      });

      // 3.2 Eliminar detalle_ventas
      const deletedDetalle = await tx.detalle_ventas.deleteMany({
        where: {
          venta: { fecha: { lt: fechaLimite }, anulada: false },
        },
      });

      // 3.3 Eliminar ventas
      const deletedVentas = await tx.ventas.deleteMany({
        where: {
          fecha: { lt: fechaLimite },
          anulada: false,
        },
      });

      // 3.4 Log de auditoría
      await tx.audit_log.create({
        data: {
          accion: 'PURGE_VENTAS',
          usuario_id: userId,
          detalles: JSON.stringify({
            fecha_limite: fechaLimite,
            ventas_eliminadas: deletedVentas.count,
            detalle_eliminado: deletedDetalle.count,
            movimientos_eliminados: deletedMovimientos.count,
          }),
        },
      });

      return {
        ventas: deletedVentas.count,
        detalle_ventas: deletedDetalle.count,
        movimientos_stock: deletedMovimientos.count,
      };
    });

    return {
      dry_run: false,
      fecha_limite: fechaLimite,
      registros_eliminados: result,
      success: true,
    };
  }
}
```

### 1.7 Critical Tests

```typescript
describe('ReportsService', () => {
  // ✅ GET stock actual - filtro stock_bajo
  it('should return only productos with stock_bajo=true', async () => {
    // Given: DB has 5 productos, 2 with stock <= stock_minimo
    // When: getStockActual({ stock_bajo: true })
    // Then: returns 2 productos, all have stock_bajo = true
  });

  // ✅ GET proximos vencer - días configurables
  it('should return productos venciendo in 7 days when dias=7', async () => {
    // Given: DB has lotes venciendo en [5, 10, 20] días
    // When: getProximosVencer({ dias: 7 })
    // Then: returns only lote venciendo en 5 días
  });

  // ✅ GET sin movimiento - días configurables
  it('should return productos sin ventas en últimos 60 días when dias=60', async () => {
    // Given: Productos con última venta hace [30, 70, 90] días
    // When: getSinMovimiento({ dias: 60 })
    // Then: returns productos con 70 y 90 días sin venta
  });

  // ✅ GET promociones vigentes - validación dinámica
  it('should return solo promociones vigentes NOW (fecha + hora + día)', async () => {
    // Given: Hoy es Lunes 14:00
    // Promo1: vigente, lunes 10:00-16:00 ✅
    // Promo2: vigente, martes 10:00-16:00 ❌ (día incorrecto)
    // Promo3: vigente, lunes 16:00-20:00 ❌ (hora fuera de rango)
    // When: getPromocionesVigentes()
    // Then: returns [Promo1]
  });

  // ✅ GET ventas diarias - filtro de fechas
  it('should return ventas between fecha_desde and fecha_hasta', async () => {
    // Given: Ventas en 2026-04-01, 2026-04-15, 2026-04-30
    // When: getVentasDiarias({ fecha_desde: '2026-04-10', fecha_hasta: '2026-04-20' })
    // Then: returns solo venta de 2026-04-15
  });

  // ✅ POST export PDF - buffer válido
  it('should generate valid PDF buffer for stock_actual', async () => {
    // When: exportPdf({ reportType: 'stock_actual' })
    // Then: returns Buffer, starts with '%PDF-'
  });

  // ✅ POST export Excel - buffer válido
  it('should generate valid Excel buffer with headers', async () => {
    // When: exportExcel({ reportType: 'ventas_diarias' })
    // Then: returns Buffer, row 1 contains headers
  });

  // ✅ DELETE purge ventas - validación 1 mes mínimo
  it('should reject purge if fecha_limite < 1 mes atrás', async () => {
    // Given: Hoy es 2026-04-20
    // When: purgeVentas({ fecha_limite: '2026-04-10' }) // solo 10 días atrás
    // Then: throw ForbiddenException 'más de 1 mes de antigüedad'
  });

  // ✅ DELETE purge ventas - dry_run
  it('should NOT delete records when dry_run=true', async () => {
    // Given: 100 ventas antes de 2026-03-01
    // When: purgeVentas({ fecha_limite: '2026-03-01', dry_run: true })
    // Then: returns { registros_a_eliminar: 100 }, DB unchanged
  });

  // ✅ DELETE purge ventas - ejecución real
  it('should delete ventas in transaction when dry_run=false', async () => {
    // Given: 50 ventas antes de 2026-02-01
    // When: purgeVentas({ fecha_limite: '2026-02-01', dry_run: false })
    // Then: deletes ventas + detalle + movimientos, creates audit_log
  });
});
```

### 1.8 Guards

```typescript
// reports.controller.ts
import { Controller, Get, Post, Delete, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  // GET endpoints - encargado y admin
  @Get('stock-actual')
  @Roles('encargado', 'admin')
  getStockActual(@Query() query: QueryStockActualDto) { }

  @Get('productos-proximos-vencer')
  @Roles('encargado', 'admin')
  getProximosVencer(@Query() query: QueryProximosVencerDto) { }

  @Get('productos-sin-movimiento')
  @Roles('encargado', 'admin')
  getSinMovimiento(@Query() query: QuerySinMovimientoDto) { }

  @Get('promociones-vigentes')
  @Roles('encargado', 'admin')
  getPromocionesVigentes() { }

  @Get('ventas-diarias')
  @Roles('encargado', 'admin')
  getVentasDiarias(@Query() query: QueryVentasDiariasDto) { }

  @Get('efectividad-promociones')
  @Roles('encargado', 'admin')
  getEfectividadPromociones(@Query() query: QueryEfectividadPromocionesDto) { }

  // POST exports - encargado y admin
  @Post('export-pdf')
  @Roles('encargado', 'admin')
  async exportPdf(@Body() dto: ExportReportDto, @Res() res: Response) {
    const buffer = await this.exportPdfService.exportReport(dto);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dto.reportType}_${Date.now()}.pdf"`);
    res.send(buffer);
  }

  @Post('export-excel')
  @Roles('encargado', 'admin')
  async exportExcel(@Body() dto: ExportReportDto, @Res() res: Response) {
    const buffer = await this.exportExcelService.exportReport(dto);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${dto.reportType}_${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  // DELETE purge - SOLO ADMIN
  @Delete('purge-ventas')
  @Roles('admin')
  purgeVentas(
    @Query() dto: PurgeVentasDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dataPurgeService.purgeVentas(dto, userId);
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### ReportsModule
- [ ] `reports.module.ts` (imports, providers, exports)
- [ ] `reports.controller.ts` (9 endpoints + guards)
- [ ] `reports.service.ts` (coordinator de servicios)
- [ ] `repositories/reports.repository.ts` (6 queries desde vistas)
- [ ] `services/export-pdf.service.ts` (pdfkit integration)
- [ ] `services/export-excel.service.ts` (exceljs integration)
- [ ] `services/data-purge.service.ts` (purge ventas manual)
- [ ] `dto/query-stock-actual.dto.ts`
- [ ] `dto/query-proximos-vencer.dto.ts`
- [ ] `dto/query-sin-movimiento.dto.ts`
- [ ] `dto/query-ventas-diarias.dto.ts`
- [ ] `dto/query-efectividad-promociones.dto.ts`
- [ ] `dto/export-report.dto.ts`
- [ ] `dto/purge-ventas.dto.ts`
- [ ] `__tests__/reports.service.spec.ts` (10 tests)
- [ ] `__tests__/export-pdf.service.spec.ts` (3 tests)
- [ ] `__tests__/export-excel.service.spec.ts` (3 tests)
- [ ] `__tests__/data-purge.service.spec.ts` (3 tests)
- [ ] `__tests__/reports.e2e-spec.ts` (9 endpoints)

### Database Views Validation
- [ ] `v_stock_actual` exists and returns correct structure
- [ ] `v_productos_proximos_vencer` exists and filters by días
- [ ] `v_productos_sin_movimiento` exists and calculates dias_sin_venta
- [ ] `v_promociones_vigentes` exists and validates fecha/hora/día
- [ ] `v_ventas_diarias` exists and aggregates medios de pago
- [ ] `v_efectividad_promociones` exists and calculates ROI metrics

### Dependencies
- [ ] `pnpm add pdfkit @types/pdfkit` (PDF export)
- [ ] `pnpm add exceljs` (Excel export)
- [ ] Prisma schema includes all 6 views as `@@map("v_*")`

---

## BUSINESS RULES SUMMARY

| Feature | Key Rule | Implementation |
|---------|----------|----------------|
| **6 DB Views** | Readonly queries | Prisma `$queryRaw` on views |
| | v_stock_actual | SUM lotes activos, flag stock_bajo |
| | v_productos_proximos_vencer | Filtro dinámico días (default 15) |
| | v_productos_sin_movimiento | Filtro dinámico días (default 30) |
| | v_promociones_vigentes | Validación fecha + hora + día_semana |
| | v_ventas_diarias | Breakdown por medio de pago |
| | v_efectividad_promociones | Métricas ROI (revenue - descuento) |
| **PDF Export** | pdfkit engine | Headers, tabla, footer, paginación |
| **Excel Export** | exceljs engine | Headers bold, auto-filter, estilos |
| **Data Purge** | Manual, solo ventas | Admin only, >1 mes, transacción |
| | Dry run default | `dry_run=true` → stats, no delete |
| | Integridad referencial | Delete detalle + movimientos + ventas |
| | Auditoría | Log en `audit_log` con user + timestamp |

---

## DATABASE VIEWS CREATION VALIDATION

```sql
-- Validar que estas 6 vistas existan en PostgreSQL

SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name IN (
    'v_stock_actual',
    'v_productos_proximos_vencer',
    'v_productos_sin_movimiento',
    'v_promociones_vigentes',
    'v_ventas_diarias',
    'v_efectividad_promociones'
  )
ORDER BY table_name;

-- Debe retornar exactamente 6 filas
```

---

## END OF SPEC_05_REPORTS

**Next Steps:**
1. Validate all 6 database views exist in `supermercado_schema_FINAL.sql`
2. Install dependencies: `pdfkit`, `exceljs`
3. Implement ReportsRepository with `$queryRaw` on views
4. Implement ExportPdfService with table rendering
5. Implement ExportExcelService with auto-filter + styling
6. Implement DataPurgeService with transaction safety
7. Test each report endpoint independently
8. Test export engines with realistic data
9. Test purge with dry_run=true first, validate counts

**Total Lines:** ~700 lines  
**Total Modules:** 1  
**Total Endpoints:** 9  
**Total Tests:** 19 critical test cases
**Total DB Views:** 6 readonly views
