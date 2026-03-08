/**
 * Pricing Types for Omnia Management System
 * 
 * Types for price calculation, markup management,
 * and pricing strategies.
 */

/**
 * Markup source - where the markup comes from
 */
export type MarkupSource = 'product' | 'category' | 'global';

/**
 * DTO for calculating price
 */
export interface CalculatePriceDto {
  cost: number;
  productId?: string;
  categoryId?: string;
}

/**
 * Price calculation result
 */
export interface PriceCalculationResult {
  calculatedPrice: number;
  suggestedPrice: number;
  markupPercentage: number;
  markupSource: MarkupSource;
}

/**
 * DTO for updating global markup
 */
export interface UpdateGlobalMarkupDto {
  markup: number;
}

/**
 * DTO for updating product/category markup
 */
export interface UpdateMarkupDto {
  id: string; // Product or Category ID
  markup: number;
}

/**
 * Price history entry
 */
export interface PriceHistory {
  id: string;
  productId: string;
  previousPrice: number;
  newPrice: number;
  previousCost: number;
  newCost: number;
  changedBy: string | null;
  changedAt: string;
  reason: string | null;
}

/**
 * Bulk price update
 */
export interface BulkPriceUpdate {
  productId: string;
  newPrice: number;
  newCost?: number;
  reason?: string;
}

/**
 * Pricing strategy configuration
 */
export interface PricingStrategy {
  globalMarkup: number;
  enableSmartRounding: boolean;
  roundingStrategy: 'nearest' | 'up' | 'down';
  roundingIncrement: number; // e.g., 5, 10, 50
}
