import { ApiClient } from './client.js';
import type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@omnia/shared-types';

export class CategoriesService {
  constructor(private client: ApiClient) {}

  /**
   * Get all categories
   */
  async getAll(): Promise<Category[]> {
    return this.client.get<Category[]>('/categories');
  }

  /**
   * Get a single category by ID
   */
  async getById(id: string): Promise<Category> {
    return this.client.get<Category>(`/categories/${id}`);
  }

  /**
   * Create a new category
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.client.post<Category>('/categories', dto);
  }

  /**
   * Update an existing category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.client.patch<Category>(
      `/categories/${id}`,
      dto
    );
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/categories/${id}`);
  }
}
