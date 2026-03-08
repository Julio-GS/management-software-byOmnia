import { ApiClient } from './client';
import type { SalesSummaryRequest, SalesSummaryResponse } from '@omnia/shared-types';

export class ReportsService {
  constructor(private client: ApiClient) {}

  /**
   * Get sales report for a date range
   */
  async getSalesReport(params: SalesSummaryRequest): Promise<SalesSummaryResponse> {
    const response = await this.client.get<SalesSummaryResponse>(
      '/reports/sales',
      {
        params,
      }
    );
    return response.data!;
  }

  /**
   * Get top selling products
   */
  async getTopProducts(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<any[]> {
    const response = await this.client.get<any[]>('/reports/top-products', {
      params: { startDate, endDate, limit },
    });
    return response.data!;
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const response = await this.client.get<any[]>(
      '/reports/revenue-by-category',
      {
        params: { startDate, endDate },
      }
    );
    return response.data!;
  }
}
