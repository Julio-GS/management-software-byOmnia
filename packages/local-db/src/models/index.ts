// Re-export shared types
export * from '@omnia/shared-types';

// Database-specific entity interfaces
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  price: string;
  cost?: string | null;
  stock: number;
  categoryId?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  syncedAt?: string | null;
  isDirty: number;
  version: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  syncedAt?: string | null;
  isDirty: number;
  version: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  total: string;
  paymentMethod: string;
  cashierId?: string | null;
  customerName?: string | null;
  notes?: string | null;
  syncedAt?: string | null;
  isDirty: number;
  version: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  isDeleted: number;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason?: string | null;
  userId?: string | null;
  syncedAt?: string | null;
  isDirty: number;
  version: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

// Create DTOs (Data Transfer Objects)
export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
}

export interface CreateProductDTO {
  name: string;
  barcode?: string;
  price: string;
  cost?: string;
  stock: number;
  categoryId?: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateProductDTO {
  name?: string;
  barcode?: string;
  price?: string;
  cost?: string;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  description?: string;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  passwordHash?: string;
  role?: string;
}

export interface CreateSaleDTO {
  total: string;
  paymentMethod: string;
  cashierId?: string;
  customerName?: string;
  notes?: string;
  items: CreateSaleItemDTO[];
}

export interface CreateSaleItemDTO {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface CreateInventoryMovementDTO {
  productId: string;
  type: string;
  quantity: number;
  previous_stock?: number;
  new_stock?: number;
  reason?: string;
  reference?: string;
  notes?: string;
  userId?: string;
  device_id?: string;
}

export interface UpdateInventoryMovementDTO {
  type?: string;
  quantity?: number;
  reason?: string;
}

// Search and filter interfaces
export interface ProductSearchOptions {
  search?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
}

export interface SalesSearchOptions {
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  paymentMethod?: string;
  minTotal?: string;
  maxTotal?: string;
}
