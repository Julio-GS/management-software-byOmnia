import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { QueryStockActualDto } from '../dto/query-stock-actual.dto';
import { QueryProximosVencerDto } from '../dto/query-proximos-vencer.dto';
import { QuerySinMovimientoDto } from '../dto/query-sin-movimiento.dto';
import { QueryVentasDiariasDto } from '../dto/query-ventas-diarias.dto';
import { QueryEfectividadPromocionesDto } from '../dto/query-efectividad-promociones.dto';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------
  // VIEWS (SPEC_05_REPORTS.md)
  // ---------------------------------------------------------

  async getStockActual(query: QueryStockActualDto) {
    const stockBajo = query.stock_bajo !== undefined ? query.stock_bajo : null;
    return this.prisma.$queryRaw`
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
      WHERE (${stockBajo}::boolean IS NULL OR stock_bajo = ${stockBajo})
      ORDER BY stock_total ASC, detalle ASC
    `;
  }

  async getProximosVencer(query: QueryProximosVencerDto) {
    const dias = query.dias ?? 15;

    return this.prisma.$queryRaw`
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

  async getSinMovimiento(query: QuerySinMovimientoDto) {
    const dias = query.dias ?? 30;

    return this.prisma.$queryRaw`
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

  async getPromocionesVigentes() {
    return this.prisma.$queryRaw`
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
        productos_incluidos,
        prioridad
      FROM v_promociones_vigentes
      ORDER BY prioridad DESC, fecha_inicio DESC
    `;
  }

  async getVentasDiarias(query: QueryVentasDiariasDto) {
    const where = [];
    
    if (query.fecha_desde) {
      where.push(`fecha >= '${query.fecha_desde}'::date`);
    }
    if (query.fecha_hasta) {
      where.push(`fecha <= '${query.fecha_hasta}'::date`);
    }
    // Note: medio_pago filter would ideally filter by joining, but the view aggregates all.
    // If we need to filter by medio_pago specifically, we could adjust the SQL dynamically,
    // but the SPEC just says to return the aggregated daily view. We'll filter dates.

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return this.prisma.$queryRawUnsafe(`
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
      ${whereClause}
      ORDER BY fecha DESC
    `);
  }

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

    return this.prisma.$queryRawUnsafe(`
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
      ${whereClause}
      ORDER BY revenue_generado DESC
    `);
  }

  // ---------------------------------------------------------
  // DASHBOARD SUPPORT (Legacy / Existing Handlers Support)
  // ---------------------------------------------------------

  /**
   * Query sales summary from materialized view dashboard_metrics
   */
  async getSalesSummaryFromView(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        total_sales: bigint;
        total_revenue: Decimal;
        total_items_sold: bigint;
      }>
    >`
      SELECT date, total_sales, total_revenue, total_items_sold
      FROM dashboard_metrics
      WHERE date >= ${startDate}::date AND date <= ${endDate}::date
      ORDER BY date DESC
    `;

    return result;
  }

  async getSalesTrends(days: number = 7) {
    const trends = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = await this.prisma.ventas.findMany({
        where: {
          fecha: {
            gte: date,
            lt: nextDate,
          },
          anulada: false,
        },
        include: {
          detalle_ventas: true,
        },
      });

      const salesCount = daySales.length;
      const revenue = daySales.reduce(
        (sum, sale) => sum.add(sale.total),
        new Decimal(0),
      );
      const productsSold = daySales.reduce(
        (sum, sale) =>
          sum + sale.detalle_ventas.reduce((itemSum, item) => itemSum + Number(item.cantidad), 0),
        0,
      );

      trends.push({
        date: date.toISOString().split('T')[0],
        sales: salesCount,
        revenue,
        productsSold,
      });
    }

    return trends;
  }
}
