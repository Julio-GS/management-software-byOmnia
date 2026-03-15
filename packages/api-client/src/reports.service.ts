import { ApiClient } from './client.js';
import type { 
  SalesSummaryRequest, 
  SalesSummaryResponse,
  LowStockReportItem,
  ProductPerformanceReport 
} from '@omnia/shared-types';

export class ReportsService {
  constructor(private client: ApiClient) {}

  /**
   * Get sales report for a date range
   */
  async getSalesReport(params: SalesSummaryRequest): Promise<SalesSummaryResponse> {
    return this.client.get<SalesSummaryResponse>(
      '/reports/sales',
      {
        params,
      }
    );
  }

  /**
   * Get top selling products
   */
  async getTopProducts(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<any[]> {
    return this.client.get<any[]>('/reports/top-products', {
      params: { startDate, endDate, limit },
    });
  }

  /**
   * Get top selling products (simplified - no date params)
   */
  async getTopProductsSimple(limit: number = 10): Promise<ProductPerformanceReport[]> {
    return this.client.get<ProductPerformanceReport[]>('/reports/top-products', {
      params: { limit },
    });
  }

  /**
   * Get sales summary (simplified - defaults to today)
   */
  async getSalesSummarySimple(): Promise<SalesSummaryResponse> {
    return this.client.get<SalesSummaryResponse>('/reports/sales-summary', {
      params: { period: 'today' },
    });
  }

  /**
   * Get low stock products
   */
  async getLowStock(): Promise<LowStockReportItem[]> {
    return this.client.get<LowStockReportItem[]>('/reports/low-stock');
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return this.client.get<any[]>(
      '/reports/revenue-by-category',
      {
        params: { startDate, endDate },
      }
    );
  }
}
