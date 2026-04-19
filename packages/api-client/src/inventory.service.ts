import { ApiClient } from './client.js';
import type {
  InventoryMovement,
  StockAdjustmentDto,
  CreateMovementDto,
} from '@omnia/shared-types';

export interface InventoryFilters {
  productId?: string;
  type?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  startDate?: string;
  endDate?: string;
}

export class InventoryService {
  constructor(private client: ApiClient) {}

  /**
   * Create an inventory movement (ENTRY, EXIT, or ADJUSTMENT)
   */
  async createMovement(dto: CreateMovementDto): Promise<InventoryMovement> {
    return this.client.post<InventoryMovement>(
      '/inventory/movement',
      dto
    );
  }

  /**
   * Adjust inventory stock to a specific value
   */
  async adjust(dto: StockAdjustmentDto): Promise<InventoryMovement> {
    return this.client.post<InventoryMovement>(
      '/inventory/adjust',
      dto
    );
  }

  /**
   * Get all inventory movements with optional filters
   */
  async getMovements(
    productId?: string,
    type?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT',
    limit?: number
  ): Promise<InventoryMovement[]> {
    const params: any = {};
    if (productId) params.productId = productId;
    if (type) params.type = type;
    if (limit) params.limit = limit;

    return this.client.get<InventoryMovement[]>(
      '/inventory/movements',
      { params }
    );
  }

  /**
   * Get movement history for a specific product
   */
  async getProductHistory(productId: string, limit?: number): Promise<InventoryMovement[]> {
    return this.client.get<InventoryMovement[]>(
      `/inventory/movements/${productId}`,
      { params: { limit } }
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

  /**
   * Create bulk inventory movements for multiple products
   */
  async bulkMovement(dto: {
    items: Array<{
      productId: string;
      stockQuantity?: number;
      setStockTo?: number;
      newPrice?: number;
      movementType?: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
      enabled?: boolean;
    }>;
    reason?: string;
    reference?: string;
    notes?: string;
    continueOnError?: boolean;
  }): Promise<{
    success: boolean;
    movements: any[];
    errors: Array<{ productId: string; error: string; code: string }>;
    processedCount: number;
    failedCount: number;
    message?: string;
  }> {
    return this.client.post('/inventory/bulk-movement', dto);
  }
}
