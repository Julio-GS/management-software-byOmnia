import { ApiClient } from './client';
import type {
  Sale,
  CreateSaleDto,
  PaginatedResponse,
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
    const response = await this.client.post<Sale>('/sales', dto);
    return response.data!;
  }

  /**
   * Get all sales with filters and pagination
   */
  async getAll(
    filters?: SaleFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Sale>> {
    const response = await this.client.get<PaginatedResponse<Sale>>('/sales', {
      params: { ...filters, ...pagination },
    });
    return response.data!;
  }

  /**
   * Get a single sale by ID
   */
  async getById(id: string): Promise<Sale> {
    const response = await this.client.get<Sale>(`/sales/${id}`);
    return response.data!;
  }

  /**
   * Cancel a sale
   */
  async cancel(id: string): Promise<Sale> {
    const response = await this.client.patch<Sale>(`/sales/${id}/cancel`);
    return response.data!;
  }
}
