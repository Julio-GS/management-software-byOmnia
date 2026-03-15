/**
 * Dashboard Types for Omnia Management System
 * 
 * Types for dashboard metrics and analytics.
 */

/**
 * Top product in sales summary
 */
export interface TopProduct {
  id: string;
  name: string;
  sales: number;
}

/**
 * Low stock product alert
 */
export interface LowStockAlert {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  categoryName?: string;
}

/**
 * Dashboard metrics aggregated from multiple endpoints
 */
export interface DashboardMetrics {
  totalSales: number;
  transactionCount: number;
  changeVsYesterday: number;
  lowStockCount: number;
  lowStockItems: LowStockAlert[];
  topProducts: TopProduct[];
  inventoryValue: number;
  inventoryChange: number;
}

/**
 * Total inventory value response
 */
export interface InventoryValueResponse {
  totalValue: number;
}

/**
 * Sales trend data point
 */
export interface SalesTrendPoint {
  date: string;
  sales: number;
  revenue: number;
  productsSold: number;
}
