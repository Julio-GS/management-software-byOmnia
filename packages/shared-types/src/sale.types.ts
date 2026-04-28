/**
 * Sales Types for Omnia Management System
 * 
 * Types for sales operations, invoicing, and
 * point-of-sale transactions.
 */

import { BaseEntity } from './common.types';

/**
 * Payment methods
 */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';

/**
 * Sale status
 */
export type SaleStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';

/**
 * Sale item - individual product in a sale
 */
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Sale entity - represents a completed transaction
 */
export interface Sale extends BaseEntity {
  numero_ticket: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  cashierId: string | null;
  deviceId: string | null;
  notes: string | null;
  caeNumber: string | null;
  caeDueDate: string | null;
  synced: boolean;
  detalle_ventas: SaleItem[];
}

/**
 * DTO for creating a sale item
 */
export interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

/**
 * DTO for creating a new sale
 */
export interface CreateSaleDto {
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
  cashierId?: string;
  deviceId?: string;
  detalle_ventas: CreateSaleItemDto[];
}

/**
 * Sale filters
 */
export interface SaleFilters {
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
  cashierId?: string;
  deviceId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  hasCae?: boolean;
  synced?: boolean;
}

/**
 * Sale summary for reports
 */
export interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  averageTicket: number;
  transactionCount: number;
  paymentMethodBreakdown: Record<PaymentMethod, number>;
}

/**
 * Daily sales report
 */
export interface DailySalesReport {
  date: string;
  sales: SaleSummary;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

/**
 * Sale refund request
 */
export interface RefundSaleDto {
  saleId: string;
  reason: string;
  detalle_ventas?: Array<{
    saleItemId: string;
    quantity: number;
  }>;
}

/**
 * Response when a sale is cancelled
 */
export interface CancelSaleResponse {
  id: string;
  numero_ticket: string;
  status: 'cancelled';
  updatedAt: string;
}
