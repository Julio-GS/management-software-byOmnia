/**
 * Category Types for Omnia Management System
 * 
 * Types for product category management, including hierarchical
 * structures and default pricing configurations.
 */

import { BaseEntity } from './common.types';

/**
 * Category entity - represents a product category
 */
export interface Category extends BaseEntity {
  name: string;
  description: string | null;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  defaultMarkup: number | null;
  isActive: boolean;
}

/**
 * DTO for creating a new category
 */
export interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  defaultMarkup?: number;
  isActive?: boolean;
}

/**
 * DTO for updating an existing category
 */
export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  defaultMarkup?: number;
  isActive?: boolean;
}

/**
 * Category with hierarchical information
 */
export interface CategoryWithHierarchy extends Category {
  parent?: Category | null;
  children?: Category[];
  level: number;
  path: string[]; // Array of parent IDs from root to current
}

/**
 * Category summary for dropdowns
 */
export interface CategorySummary {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}
