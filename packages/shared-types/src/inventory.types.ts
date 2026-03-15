/**
 * Inventory Types for Omnia Management System
 * 
 * Types for inventory management, stock movements,
 * and adjustments.
 */

import { BaseEntity } from './common.types';

/**
 * Movement types
 */
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

/**
 * Inventory movement entity - represents a stock change
 */
export interface InventoryMovement extends BaseEntity {
  productId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  reference: string | null;
  notes: string | null;
  userId: string | null;
  deviceId: string | null;
}

/**
 * DTO for creating a new inventory movement
 */
export interface CreateMovementDto {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
  deviceId?: string;
}

/**
 * DTO for stock adjustment
 */
export interface StockAdjustmentDto {
  productId: string;
  newStock: number;
  reason?: string;
  notes?: string;
  userId?: string;
  deviceId?: string;
}

/**
 * Inventory movement filters
 */
export interface InventoryMovementFilters {
  productId?: string;
  type?: MovementType;
  userId?: string;
  deviceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Stock summary for a product
 */
export interface StockSummary {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastMovementDate: string | null;
}

/**
 * Bulk stock update
 */
export interface BulkStockUpdate {
  productId: string;
  quantity: number;
  type: MovementType;
}
