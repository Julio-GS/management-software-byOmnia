import { ApiClient } from './client.js';
import type {
  Sale,
  CreateSaleDto,
  PaginatedResponse,
  CancelSaleResponse,
} from '@omnia/shared-types';

export interface SaleFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class SalesService {
  constructor(private client: ApiClient) {}

  /**
   * Create a new sale (POS checkout)
   */
  async create(dto: CreateSaleDto): Promise<Sale> {
    return this.client.post<Sale>('/sales', dto);
  }

  /**
   * Get all sales with filters and pagination
   */
  async getAll(
    filters?: SaleFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Sale>> {
    return this.client.get<PaginatedResponse<Sale>>('/sales', {
      params: { ...filters, ...pagination },
    });
  }

  /**
   * Get a single sale by ID
   */
  async getById(id: string): Promise<Sale> {
    return this.client.get<Sale>(`/sales/${id}`);
  }

  /**
   * Cancel a sale
   */
  async cancel(id: string): Promise<CancelSaleResponse> {
    return this.client.patch<CancelSaleResponse>(`/sales/${id}/cancel`);
  }
}
