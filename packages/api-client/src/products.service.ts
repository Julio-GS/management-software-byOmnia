import { ApiClient } from './client';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  PaginatedResponse,
} from '@omnia/shared-types';

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  active?: boolean;
  lowStock?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductsService {
  constructor(private client: ApiClient) {}

  /**
   * Get all products with optional filters and pagination
   */
  async getAll(
    filters?: ProductFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    const response = await this.client.get<PaginatedResponse<Product>>(
      '/products',
      {
        params: { ...filters, ...pagination },
      }
    );
    return response.data!;
  }

  /**
   * Get a single product by ID
   */
  async getById(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/products/${id}`);
    return response.data!;
  }

  /**
   * Get a product by barcode (for POS)
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const response = await this.client.get<Product>(
        `/products/barcode/${barcode}`
      );
      return response.data || null;
    } catch (error: any) {
      // Return null if not found (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async create(dto: CreateProductDto): Promise<Product> {
    const response = await this.client.post<Product>('/products', dto);
    return response.data!;
  }

  /**
   * Update an existing product
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const response = await this.client.patch<Product>(`/products/${id}`, dto);
    return response.data!;
  }

  /**
   * Delete a product
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/products/${id}`);
  }

  /**
   * Get products with low stock
   */
  async getLowStock(threshold?: number): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/products/low-stock', {
      params: { threshold },
    });
    return response.data!;
  }
}
