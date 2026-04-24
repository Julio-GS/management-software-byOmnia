import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { ReportsRepository } from './repositories/reports.repository';
import {
  SalesSummaryDto,
  TopProductDto,
  LowStockProductDto,
  StockRotationDto,
  RevenueByCategoryDto,
  SalesTrendDto,
  PeriodType,
} from './dto/sales-summary.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    logger.setContext(ReportsService.name);
  }

  async getSalesSummary(period: PeriodType): Promise<SalesSummaryDto> {
    // Feature flag check for materialized view (Phase 14)
    const viewEnabled = process.env.ENABLE_DASHBOARD_VIEW === 'true';

    if (viewEnabled) {
      // NEW path: query from materialized view
      return this.queryFromMaterializedView(period);
    }

    // Feature flag check for cache (Phase 6)
    const cacheEnabled = process.env.ENABLE_DASHBOARD_CACHE === 'true';

    if (!cacheEnabled) {
      // OLD path: direct DB query
      return this.calculateSalesSummary(period);
    }

    // CACHE path: cache-first
    const cacheKey = 'dashboard:metrics';
    const cached = await this.cacheManager.get<SalesSummaryDto>(cacheKey);

    if (cached) {
      // Cache HIT
      this.logger.debug({ cacheKey }, 'Dashboard cache HIT');
      return cached;
    }

    // Cache MISS - calculate metrics
    this.logger.info({ cacheKey, period }, 'Dashboard cache MISS - calculating metrics');
    const summary = await this.calculateSalesSummary(period);
    await this.cacheManager.set(cacheKey, summary, 120000); // 2 min TTL
    return summary;
  }

  private async calculateSalesSummary(period: PeriodType): Promise<SalesSummaryDto> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const sales = await this.reportsRepository.getSalesSummary(startDate, endDate);
    const previousSales = await this.reportsRepository.getSalesSummaryForPreviousPeriod(
      startDate,
      endDate,
    );

    const totalSales = sales.length;
    const totalRevenue = sales.reduce(
      (sum, sale) => sum.add(sale.total),
      new Decimal(0),
    );
    const productsSold = sales.reduce(
      (sum, sale) =>
        sum + sale.detalle_ventas.reduce((itemSum, item) => itemSum + Number(item.cantidad), 0),
      0,
    );
    const avgTransactionValue =
      totalSales > 0 ? totalRevenue.dividedBy(totalSales) : new Decimal(0);

    // Calculate change vs previous period
    const previousRevenue = previousSales.reduce(
      (sum, sale) => sum.add(sale.total),
      new Decimal(0),
    );
    const changeVsYesterday = previousRevenue.greaterThan(0)
      ? totalRevenue
          .minus(previousRevenue)
          .dividedBy(previousRevenue)
          .times(100)
          .toNumber()
      : 0;

    return {
      totalSales,
      totalRevenue: totalRevenue.toNumber(),
      productsSold,
      avgTransactionValue: avgTransactionValue.toNumber(),
      changeVsYesterday,
    };
  }

  /**
   * Query sales summary from materialized view (Phase 14: Read Models)
   * 
   * NOTE: This is a proof-of-concept implementation. PostgreSQL materialized views
   * are designed for batch/scheduled refreshes, NOT real-time updates. The in-memory
   * cache approach (Phase 6, ENABLE_DASHBOARD_CACHE) is more suitable for this use case.
   * 
   * This implementation demonstrates CQRS read model separation but may have stale data
   * between refreshes triggered by SaleCreatedEvent/SaleCancelledEvent.
   */
  private async queryFromMaterializedView(period: PeriodType): Promise<SalesSummaryDto> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const viewData = await this.reportsRepository.getSalesSummaryFromView(
      startDate,
      endDate,
    );

    // Aggregate metrics from daily rows
    const totalSales = viewData.reduce((sum, row) => sum + Number(row.total_sales), 0);
    const totalRevenue = viewData.reduce(
      (sum, row) => sum.add(row.total_revenue),
      new Decimal(0),
    );
    const productsSold = viewData.reduce(
      (sum, row) => sum + Number(row.total_items_sold),
      0,
    );
    const avgTransactionValue =
      totalSales > 0 ? totalRevenue.dividedBy(totalSales) : new Decimal(0);

    // NOTE: changeVsYesterday calculation requires previous period data
    // For simplicity, returning 0 here (can be enhanced with another view query)
    const changeVsYesterday = 0;

    return {
      totalSales,
      totalRevenue: totalRevenue.toNumber(),
      productsSold,
      avgTransactionValue: avgTransactionValue.toNumber(),
      changeVsYesterday,
    };
  }

  async getTopProducts(limit: number = 10): Promise<TopProductDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const topProducts = await this.reportsRepository.getTopProducts(
      today,
      tomorrow,
      limit,
    );

    return topProducts.map((product) => ({
      id: product.productId,
      name: product.name,
      quantitySold: product.quantitySold,
      revenue: product.revenue.toNumber(),
    }));
  }

  async getLowStockProducts(): Promise<LowStockProductDto[]> {
    const products = await this.reportsRepository.getLowStockProducts();

    return products.map((product) => ({
      id: product.id,
      name: product.detalle,
      currentStock: product.stock_actual,
      minStock: product.stock_minimo,
      categoryName: product.rubros?.nombre,
    }));
  }

  async getStockRotation(): Promise<StockRotationDto[]> {
    const rotation = await this.reportsRepository.getStockRotation(30);

    return rotation.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      averageDailySales: Number(item.averageDailySales.toFixed(2)),
      currentStock: item.currentStock,
      daysUntilStockout: Number(item.daysUntilStockout.toFixed(1)),
      rotationRate: Number(item.rotationRate.toFixed(2)),
    }));
  }

  async getRevenueByCategory(): Promise<RevenueByCategoryDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const revenue = await this.reportsRepository.getRevenueByCategory(
      today,
      tomorrow,
    );

    return revenue.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      revenue: item.revenue.toNumber(),
      salesCount: item.salesCount,
      percentage: Number(item.percentage.toFixed(2)),
    }));
  }

  async getSalesTrends(days: number = 7): Promise<SalesTrendDto[]> {
    const trends = await this.reportsRepository.getSalesTrends(days);

    return trends.map((trend) => ({
      date: trend.date,
      sales: trend.sales,
      revenue: trend.revenue.toNumber(),
      productsSold: trend.productsSold,
    }));
  }

  private getPeriodDates(period: PeriodType): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (period) {
      case PeriodType.TODAY:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case PeriodType.WEEK:
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case PeriodType.MONTH:
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }
}
