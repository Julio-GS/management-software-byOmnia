/**
 * Common Types for Omnia Management System
 * 
 * Shared API response wrappers, pagination, and metadata types
 * used across all modules.
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}

/**
 * Pagination request parameters
 */
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Sync metadata for offline-first operations
 */
export interface SyncMetadata {
  deviceId: string;
  timestamp: string;
  version: number;
  synced: boolean;
}

/**
 * Base entity timestamps
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: string;
  to?: string;
}

/**
 * Search filter
 */
export interface SearchFilter {
  search?: string;
  searchFields?: string[];
}
