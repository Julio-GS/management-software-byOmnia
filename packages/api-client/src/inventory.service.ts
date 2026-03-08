import { ApiClient } from './client';
import type {
  InventoryMovement,
  StockAdjustmentDto,
  PaginatedResponse,
} from '@omnia/shared-types';

export interface InventoryFilters {
  productId?: string;
  type?: 'IN' | 'OUT' | 'ADJUSTMENT';
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class InventoryService {
  constructor(private client: ApiClient) {}

  /**
   * Adjust inventory (add, remove, or set stock)
   */
  async adjust(dto: StockAdjustmentDto): Promise<InventoryMovement> {
    const response = await this.client.post<InventoryMovement>(
      '/inventory/adjust',
      dto
    );
    return response.data!;
  }

  /**
   * Get inventory logs with filters and pagination
   */
  async getLogs(
    filters?: InventoryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const response = await this.client.get<PaginatedResponse<InventoryMovement>>(
      '/inventory/logs',
      {
        params: { ...filters, ...pagination },
      }
    );
    return response.data!;
  }

  /**
   * Get products with low stock
   */
  async getLowStock(threshold?: number): Promise<any[]> {
    const response = await this.client.get<any[]>('/inventory/low-stock', {
      params: { threshold },
    });
    return response.data!;
  }
}
