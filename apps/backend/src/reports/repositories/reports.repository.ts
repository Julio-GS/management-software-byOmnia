import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(startDate: Date, endDate: Date) {
    const sales = await this.prisma.ventas.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        anulada: false,
      },
      include: {
        detalle_ventas: true,
      },
    });

    return sales;
  }

  async getSalesSummaryForPreviousPeriod(startDate: Date, endDate: Date) {
    const duration = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - duration);
    const previousEnd = new Date(endDate.getTime() - duration);

    return this.getSalesSummary(previousStart, previousEnd);
  }

  /**
   * Query sales summary from materialized view dashboard_metrics
   * @param startDate - Start date of the period
   * @param endDate - End date of the period
   * @returns Aggregated metrics from the materialized view
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

  async getTopProducts(startDate: Date, endDate: Date, limit: number = 10) {
    const result = await this.prisma.detalle_ventas.groupBy({
      by: ['producto_id'],
      where: {
        venta: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
          estado: 'completed',
        },
      },
      _sum: {
        cantidad: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          cantidad: 'desc',
        },
      },
      take: limit,
    });

    // Fetch product details
    const productsData = await Promise.all(
      result.map(async (item) => {
        const product = await this.prisma.productos.findUnique({
          where: { id: item.producto_id },
        });
        return {
          productId: item.producto_id,
          name: product?.detalle || 'Unknown',
          quantitySold: item._sum.cantidad || 0,
          revenue: item._sum.subtotal || new Decimal(0),
        };
      }),
    );

    return productsData;
  }

  async getLowStockProducts(threshold?: number) {
    const products = await this.prisma.productos.findMany({
      where: {
        activo: true,
        maneja_stock: true,
      },
      include: {
        rubros: true,
        lotes: {
          where: {
            activo: true,
          },
        },
      },
    });

    // Calculate stock_actual from lotes and filter
    return products
      .map((p) => ({
        ...p,
        stock_actual: p.lotes.reduce((sum, lote) => sum + lote.cantidad_actual, 0),
      }))
      .filter((p) => {
        const compareValue = threshold !== undefined ? threshold : p.stock_minimo || 0;
        return p.stock_actual <= compareValue;
      })
      .sort((a, b) => a.stock_actual - b.stock_actual);
  }

  async getStockRotation(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesData = await this.prisma.detalle_ventas.groupBy({
      by: ['producto_id'],
      where: {
        venta: {
          created_at: {
            gte: startDate,
          },
          estado: 'completed',
        },
      },
      _sum: {
        cantidad: true,
      },
    });

    const rotationData = await Promise.all(
      salesData.map(async (item) => {
        const product = await this.prisma.productos.findUnique({
          where: { id: item.producto_id },
          include: {
            lotes: {
              where: { activo: true },
            },
          },
        });

        if (!product) return null;

        const totalSold = Number(item._sum.cantidad) || 0;
        const averageDailySales = totalSold / days;
        const currentStock = product.lotes.reduce((sum, lote) => sum + lote.cantidad_actual, 0);
        const daysUntilStockout =
          averageDailySales > 0 ? currentStock / averageDailySales : Infinity;
        const rotationRate = currentStock > 0 ? totalSold / currentStock : 0;


        return {
          productId: product.id,
          productName: product.detalle,
          averageDailySales,
          currentStock,
          daysUntilStockout: daysUntilStockout === Infinity ? -1 : daysUntilStockout,
          rotationRate,
        };
      }),
    );

    return rotationData.filter((item) => item !== null);
  }

  async getRevenueByCategory(startDate: Date, endDate: Date) {
    const salesItems = await this.prisma.detalle_ventas.findMany({
      where: {
        ventas: {
          fecha: {
            gte: startDate,
            lte: endDate,
          },
          anulada: false,
        },
      },
      include: {
        productos: {
          include: {
            rubros: true,
          },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      string,
      { name: string; revenue: Decimal; count: number }
    >();

    salesItems.forEach((item) => {
      const categoryId = item.productos.rubro_id || 'uncategorized';
      const categoryName = item.productos.rubros?.nombre || 'Sin Categoría';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          name: categoryName,
          revenue: new Decimal(0),
          count: 0,
      });
      }

      const existing = categoryMap.get(categoryId)!;
      existing.revenue = existing.revenue.add(item.subtotal);
      existing.count += 1;
    });

    // Calculate total for percentages
    let totalRevenue = new Decimal(0);
    categoryMap.forEach((value) => {
      totalRevenue = totalRevenue.add(value.revenue);
    });

    // Convert to array with percentages
    const result = Array.from(categoryMap.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      revenue: data.revenue,
      salesCount: data.count,
      percentage: totalRevenue.greaterThan(0)
        ? data.revenue.dividedBy(totalRevenue).times(100).toNumber()
        : 0,
    }));

    return result.sort((a, b) => b.revenue.minus(a.revenue).toNumber());
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
