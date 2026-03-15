/**
 * Report Types for Omnia Management System
 * 
 * Types for analytics, reporting, and business intelligence.
 */

import { PaymentMethod } from './sale.types';
import { DateRangeFilter } from './common.types';

/**
 * Report period
 */
export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Sales summary DTO (request)
 */
export interface SalesSummaryRequest extends DateRangeFilter {
  period?: ReportPeriod;
  cashierId?: string;
  deviceId?: string;
  categoryId?: string;
}

/**
 * Sales summary response
 */
export interface SalesSummaryResponse {
  period: {
    from: string;
    to: string;
  };
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalTax: number;
  totalDiscount: number;
  averageTicket: number;
  transactionCount: number;
  profitMargin: number;
  paymentMethodBreakdown: Record<PaymentMethod, {
    count: number;
    amount: number;
  }>;
}

/**
 * Product performance report
 */
export interface ProductPerformanceReport {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  averagePrice: number;
  stockRemaining: number;
  turnoverRate: number;
}

/**
 * Low stock report item
 */
export interface LowStockReportItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  stockDifference: number;
  categoryName: string | null;
  lastSaleDate: string | null;
  suggestedReorderQty: number;
}

/**
 * Category performance report
 */
export interface CategoryPerformanceReport {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  averageMarkup: number;
  quantitySold: number;
}

/**
 * Cashier performance report
 */
export interface CashierPerformanceReport {
  cashierId: string;
  cashierName: string;
  transactionCount: number;
  totalRevenue: number;
  averageTicket: number;
  itemsPerTransaction: number;
  refundCount: number;
  refundAmount: number;
}

/**
 * Inventory valuation report
 */
export interface InventoryValuationReport {
  totalProducts: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    costValue: number;
    retailValue: number;
  }>;
}

/**
 * Daily sales trend
 */
export interface DailySalesTrend {
  date: string;
  revenue: number;
  transactions: number;
  averageTicket: number;
}

/**
 * Hourly sales distribution
 */
export interface HourlySalesDistribution {
  hour: number;
  transactions: number;
  revenue: number;
}

/**
 * GMROI (Gross Margin Return on Investment) by category
 */
export interface GMROIReport {
  categoryId: string;
  categoryName: string;
  grossMargin: number;
  averageInventoryValue: number;
  gmroi: number;
}

/**
 * ABC Analysis result
 */
export interface ABCAnalysisResult {
  productId: string;
  productName: string;
  sku: string;
  revenue: number;
  revenuePercentage: number;
  cumulativePercentage: number;
  classification: 'A' | 'B' | 'C';
}
