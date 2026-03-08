import { Injectable } from '@nestjs/common';
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
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getSalesSummary(period: PeriodType): Promise<SalesSummaryDto> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const sales = await this.reportsRepository.getSalesSummary(startDate, endDate);
    const previousSales = await this.reportsRepository.getSalesSummaryForPreviousPeriod(
      startDate,
      endDate,
    );

    const totalSales = sales.length;
    const totalRevenue = sales.reduce(
      (sum, sale) => sum.add(sale.totalAmount),
      new Decimal(0),
    );
    const productsSold = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const avgTransactionValue =
      totalSales > 0 ? totalRevenue.dividedBy(totalSales) : new Decimal(0);

    // Calculate change vs previous period
    const previousRevenue = previousSales.reduce(
      (sum, sale) => sum.add(sale.totalAmount),
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
      name: product.name,
      currentStock: product.stock,
      minStock: product.minStock,
      categoryName: product.category?.name,
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
