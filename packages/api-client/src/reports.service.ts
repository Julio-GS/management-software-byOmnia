import { ApiClient } from './client.js';
import type { SalesSummaryRequest, SalesSummaryResponse } from '@omnia/shared-types';

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
