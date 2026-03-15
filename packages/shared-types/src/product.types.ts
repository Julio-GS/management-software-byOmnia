/**
 * Product Types for Omnia Management System
 * 
 * Types for product management, including CRUD operations,
 * filters, and business logic interfaces.
 */

import { BaseEntity } from './common.types';

/**
 * Product entity - represents a sellable product
 */
export interface Product extends BaseEntity {
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  markup: number | null;
  stock: number;
  minStock: number;
  maxStock: number | null;
  categoryId: string | null;
  isActive: boolean;
  taxRate: number;
  imageUrl: string | null;
}

/**
 * DTO for creating a new product
 */
export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  categoryId?: string;
  markup?: number;
  taxRate?: number;
  imageUrl?: string;
  isActive?: boolean;
}

/**
 * DTO for updating an existing product
 */
export interface UpdateProductDto {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  categoryId?: string;
  markup?: number;
  taxRate?: number;
  imageUrl?: string;
  isActive?: boolean;
}

/**
 * Filters for querying products
 */
export interface ProductFilters {
  categoryId?: string;
  search?: string; // Search by name, SKU, or barcode
  isActive?: boolean;
  lowStock?: boolean; // stock <= minStock
  outOfStock?: boolean; // stock === 0
  minPrice?: number;
  maxPrice?: number;
  hasBarcode?: boolean;
}

/**
 * Product with calculated fields (for display)
 */
export interface ProductWithCalculations extends Product {
  profitMargin: number; // Percentage
  priceWithTax: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  canBeSold: boolean;
}

/**
 * Product summary for quick lookups
 */
export interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  isActive: boolean;
}
