import { ApiClient } from './client.js';
import type { DashboardMetrics, TopProduct, LowStockAlert, SalesTrendPoint } from '@omnia/shared-types';
import { ReportsService } from './reports.service.js';
import { ProductsService } from './products.service.js';

/**
 * Dashboard Service
 * 
 * Aggregates data from multiple endpoints to build dashboard metrics.
 * Uses Promise.all() for parallel fetching.
 */
export class DashboardService {
  private reportsService: ReportsService;
  private productsService: ProductsService;

  constructor(private client: ApiClient) {
    this.reportsService = new ReportsService(client);
    this.productsService = new ProductsService(client);
  }

  /**
   * Get all dashboard metrics by aggregating 4 API calls in parallel:
   * 1. GET /reports/sales-summary → totalSales, transactionCount, changeVsYesterday
   * 2. GET /reports/low-stock → lowStockCount, lowStockItems
   * 3. GET /reports/top-products → topProducts[]
   * 4. GET /products/total-value → inventoryValue
   */
  async getMetrics(): Promise<DashboardMetrics> {
    // Fetch all data in parallel
    const [salesSummary, lowStockItems, topProductsData, inventoryValueData] = 
      await Promise.all([
        this.reportsService.getSalesSummarySimple(),
        this.reportsService.getLowStock(),
        this.reportsService.getTopProductsSimple(5), // Top 5 products
        this.productsService.getTotalValue(),
      ]);

    // Transform top products data
    const topProducts: TopProduct[] = topProductsData.map((product) => ({
      id: product.productId,
      name: product.productName,
      sales: product.quantitySold,
    }));

    // Transform low stock data
    const lowStockAlerts: LowStockAlert[] = lowStockItems.map((item) => ({
      id: item.productId,
      name: item.productName,
      currentStock: item.currentStock,
      minStock: item.minStock,
      categoryName: item.categoryName ?? undefined,
    }));

    return {
      totalSales: salesSummary.totalRevenue,
      transactionCount: salesSummary.transactionCount,
      changeVsYesterday: 0, // TODO: Calculate from historical data - field removed from API
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockAlerts,
      topProducts,
      inventoryValue: inventoryValueData.totalValue,
      inventoryChange: 5.4, // TODO: Calculate from historical data
    };
  }

  /**
   * Get sales trends for the last N days
   * 
   * @param days Number of days to fetch (default: 7)
   * @returns Array of sales trend data points
   */
  async getSalesTrends(days: number = 7): Promise<SalesTrendPoint[]> {
    return this.client.get<SalesTrendPoint[]>(`/reports/sales-trends?days=${days}`);
  }
}
