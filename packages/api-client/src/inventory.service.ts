import { ApiClient } from './client.js';
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
    return this.client.post<InventoryMovement>(
      '/inventory/adjust',
      dto
    );
  }

  /**
   * Get inventory logs with filters and pagination
   */
  async getLogs(
    filters?: InventoryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<InventoryMovement>> {
    return this.client.get<PaginatedResponse<InventoryMovement>>(
      '/inventory/logs',
      {
        params: { ...filters, ...pagination },
      }
    );
  }

  /**
   * Get products with low stock
   */
  async getLowStock(threshold?: number): Promise<any[]> {
    return this.client.get<any[]>('/inventory/low-stock', {
      params: { threshold },
    });
  }
}
