import { ApiClient } from './client';
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
    const response = await this.client.get<Category[]>('/categories');
    return response.data!;
  }

  /**
   * Get a single category by ID
   */
  async getById(id: string): Promise<Category> {
    const response = await this.client.get<Category>(`/categories/${id}`);
    return response.data!;
  }

  /**
   * Create a new category
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    const response = await this.client.post<Category>('/categories', dto);
    return response.data!;
  }

  /**
   * Update an existing category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const response = await this.client.patch<Category>(
      `/categories/${id}`,
      dto
    );
    return response.data!;
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/categories/${id}`);
  }
}
