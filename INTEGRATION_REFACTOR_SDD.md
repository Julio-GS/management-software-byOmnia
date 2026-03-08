# Software Design Document: Backend-Frontend-Desktop Integration Refactoring

**Project:** OMNIA Management System  
**Document Version:** 1.0  
**Date:** March 8, 2026  
**Author:** OpenCode AI Assistant

---

## 1. Executive Summary

### 1.1 Purpose
This document outlines the architectural refactoring required to eliminate code duplication, improve type safety, and establish consistent integration patterns across the three application layers: NestJS Backend, Next.js Web Frontend, and Electron Desktop.

### 1.2 Current Problems
- **Code Duplication:** Auth logic, API clients, and business logic duplicated across 3 layers
- **Type Safety Issues:** Shared-types package underutilized, leading to type drift
- **Inconsistent Integration:** Mixed patterns (IPC→SQLite, IPC→HTTP, direct HTTP)
- **Tight Coupling:** Feature hooks locked to Electron environment
- **Missing Abstractions:** No unified API service layer

### 1.3 Proposed Solution
**Hybrid Approach:** Expand shared types + Create unified API client abstraction

**Benefits:**
- Single source of truth for types and API contracts
- Environment-agnostic API client (auto-detects web vs desktop)
- Preserved offline-first capabilities for POS
- Reduced maintenance burden
- Improved developer experience

**Estimated Effort:** 16-20 hours over 3 phases

---

## 2. Architecture Overview

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Web Frontend (Next.js)              │
│  ┌─────────────────┐        ┌──────────────────┐       │
│  │ Auth Context    │        │ Feature Hooks    │       │
│  │ (axios client)  │        │ (Electron-only)  │       │
│  └────────┬────────┘        └─────────┬────────┘       │
│           │                           │                 │
│           │ HTTP                      │ window.electron │
└───────────┼───────────────────────────┼─────────────────┘
            │                           │
            │                           ▼
            │                  ┌─────────────────────────┐
            │                  │ Desktop (Electron)      │
            │                  │ ┌─────────────────────┐ │
            │                  │ │ IPC Handlers        │ │
            │                  │ │ - Auth Service      │ │
            │                  │ │ - HTTP Client       │ │
            │                  │ │ - Local SQLite      │ │
            │                  │ └──────┬──────────────┘ │
            │                  └────────┼────────────────┘
            │                           │ HTTP
            ▼                           ▼
┌───────────────────────────────────────────────────────┐
│              Backend (NestJS + PostgreSQL)            │
│  /api/v1/auth, /products, /inventory, /pricing, etc.  │
└───────────────────────────────────────────────────────┘
```

**Issues:**
- 3 different auth implementations
- 2 different HTTP clients (web axios vs desktop axios)
- Business logic in IPC handlers duplicates backend

### 2.2 Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Shared Packages Layer                      │
│  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │ @omnia/shared-types  │  │ @omnia/api-client      │  │
│  │ - DTOs (all modules) │  │ - Service abstraction  │  │
│  │ - Response wrappers  │  │ - Auto-detects env     │  │
│  └──────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ imports
         ┌───────────────┴────────────────┐
         │                                │
┌────────┴──────────┐          ┌─────────┴────────────┐
│ Web Frontend      │          │ Desktop Electron     │
│ - Uses api-client │          │ - Uses api-client    │
│ - Type-safe       │          │ - Thin IPC layer     │
└────────┬──────────┘          └─────────┬────────────┘
         │                               │
         │ HTTP (online)                 │ IPC → HTTP
         │                               │ SQLite (offline)
         └───────────────┬───────────────┘
                         ▼
         ┌────────────────────────────────┐
         │ Backend (NestJS)               │
         │ - Single source of truth       │
         │ - Generated types for frontend │
         └────────────────────────────────┘
```

**Benefits:**
- Single API client used by both web and desktop
- Type safety guaranteed at compile time
- Simplified IPC handlers (thin proxy only)
- Preserved offline mode for critical operations

---

## 3. Detailed Design

### 3.1 Phase 1: Expand Shared Types Package

**Goal:** Create comprehensive type library covering all backend modules

#### 3.1.1 New Package Structure

```
packages/shared-types/
├── src/
│   ├── auth.types.ts          # ✅ Exists
│   ├── user.types.ts          # ✅ Exists
│   ├── product.types.ts       # 🆕 NEW
│   ├── category.types.ts      # 🆕 NEW
│   ├── inventory.types.ts     # 🆕 NEW
│   ├── pricing.types.ts       # 🆕 NEW
│   ├── sale.types.ts          # 🆕 NEW
│   ├── report.types.ts        # 🆕 NEW
│   ├── sync.types.ts          # 🆕 NEW
│   ├── common.types.ts        # 🆕 NEW (API response wrappers)
│   └── index.ts               # Re-exports all
├── package.json
└── tsconfig.json
```

#### 3.1.2 Type Generation Strategy

**Option A: Manual Migration (Recommended for MVP)**
- Extract DTOs from backend manually
- Keep in sync via code reviews
- **Effort:** 2-3 hours
- **Pros:** Full control, no build tooling
- **Cons:** Manual maintenance required

**Option B: Auto-generation**
- Use `prisma-generator-nestjs-dto` or custom script
- Generate from Prisma schema
- **Effort:** 4-5 hours (setup + testing)
- **Pros:** Always in sync
- **Cons:** Complex build process

**Decision:** Use Option A for Phase 1, migrate to Option B in future iteration

#### 3.1.3 Common Types (common.types.ts)

```typescript
// API Response Wrapper
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
  };
}

// Pagination
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// Sync metadata
export interface SyncMetadata {
  deviceId: string;
  timestamp: string;
  version: number;
}
```

#### 3.1.4 Example: Product Types (product.types.ts)

```typescript
export interface Product {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  cost: number;
  markup?: number; // Specific markup, nullable
  price: number;
  ivaRate: number;
  stockQuantity: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  cost: number;
  markup?: number;
  ivaRate: number;
  minStock?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: string;
}

export interface ProductFilters {
  categoryId?: string;
  search?: string; // Search by name or barcode
  active?: boolean;
  lowStock?: boolean; // quantity <= minStock
}
```

#### 3.1.5 Migration Plan

**Files to migrate (Backend → Shared Types):**

1. **Products Module:**
   - `apps/backend/src/products/dto/*` → `packages/shared-types/src/product.types.ts`
   
2. **Categories Module:**
   - `apps/backend/src/categories/dto/*` → `packages/shared-types/src/category.types.ts`

3. **Inventory Module:**
   - `apps/backend/src/inventory/dto/*` → `packages/shared-types/src/inventory.types.ts`

4. **Pricing Module:**
   - `apps/backend/src/pricing/dto/*` → `packages/shared-types/src/pricing.types.ts`

5. **Sales Module:**
   - `apps/backend/src/sales/dto/*` → `packages/shared-types/src/sale.types.ts`

6. **Reports Module:**
   - `apps/backend/src/reports/dto/*` → `packages/shared-types/src/report.types.ts`

7. **Sync Module:**
   - `apps/backend/src/sync/dto/*` → `packages/shared-types/src/sync.types.ts`

**Backend Update:**
- Replace local DTOs with imports from `@omnia/shared-types`
- Keep NestJS decorators in separate validation classes if needed

---

### 3.2 Phase 2: Create Unified API Client Package

**Goal:** Single API client that works in both web and desktop contexts

#### 3.2.1 New Package Structure

```
packages/api-client/
├── src/
│   ├── client.ts              # Core HTTP client
│   ├── auth.service.ts        # Auth operations
│   ├── products.service.ts    # Products CRUD
│   ├── categories.service.ts  # Categories CRUD
│   ├── inventory.service.ts   # Inventory operations
│   ├── pricing.service.ts     # Pricing calculations
│   ├── sales.service.ts       # Sales operations
│   ├── reports.service.ts     # Reports/analytics
│   ├── sync.service.ts        # Sync operations
│   ├── types.ts               # Client config types
│   └── index.ts               # Main export
├── package.json
└── tsconfig.json
```

#### 3.2.2 Core Client Implementation (client.ts)

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@omnia/shared-types';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  environment?: 'web' | 'desktop';
}

export class ApiClient {
  private axios: AxiosInstance;
  private config: ApiClientConfig;
  
  constructor(config: ApiClientConfig) {
    this.config = config;
    
    // Auto-detect environment if not specified
    if (!config.environment) {
      config.environment = typeof window !== 'undefined' && 
        'electron' in window ? 'desktop' : 'web';
    }
    
    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor - inject token
    this.axios.interceptors.request.use(async (config) => {
      if (this.config.getToken) {
        const token = await this.config.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
    
    // Response interceptor - handle errors
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.config.onUnauthorized?.();
        }
        return Promise.reject(error);
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.get<ApiResponse<T>>(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axios.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}
```

#### 3.2.3 Service Example: Products Service (products.service.ts)

```typescript
import { ApiClient } from './client';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
  PaginatedRequest,
  PaginatedResponse,
} from '@omnia/shared-types';

export class ProductsService {
  constructor(private client: ApiClient) {}
  
  async getAll(
    filters?: ProductFilters,
    pagination?: PaginatedRequest
  ): Promise<PaginatedResponse<Product>> {
    const response = await this.client.get<PaginatedResponse<Product>>('/products', {
      params: { ...filters, ...pagination },
    });
    return response.data!;
  }
  
  async getById(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/products/${id}`);
    return response.data!;
  }
  
  async getByBarcode(barcode: string): Promise<Product | null> {
    const response = await this.client.get<Product>(`/products/barcode/${barcode}`);
    return response.data || null;
  }
  
  async create(dto: CreateProductDto): Promise<Product> {
    const response = await this.client.post<Product>('/products', dto);
    return response.data!;
  }
  
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const response = await this.client.patch<Product>(`/products/${id}`, dto);
    return response.data!;
  }
  
  async delete(id: string): Promise<void> {
    await this.client.delete(`/products/${id}`);
  }
  
  async getLowStock(threshold?: number): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/products/low-stock', {
      params: { threshold },
    });
    return response.data!;
  }
}
```

#### 3.2.4 Main Export (index.ts)

```typescript
import { ApiClient, ApiClientConfig } from './client';
import { AuthService } from './auth.service';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { InventoryService } from './inventory.service';
import { PricingService } from './pricing.service';
import { SalesService } from './sales.service';
import { ReportsService } from './reports.service';
import { SyncService } from './sync.service';

export class OmniaApiClient {
  public auth: AuthService;
  public products: ProductsService;
  public categories: CategoriesService;
  public inventory: InventoryService;
  public pricing: PricingService;
  public sales: SalesService;
  public reports: ReportsService;
  public sync: SyncService;
  
  private client: ApiClient;
  
  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config);
    
    // Initialize all services
    this.auth = new AuthService(this.client);
    this.products = new ProductsService(this.client);
    this.categories = new CategoriesService(this.client);
    this.inventory = new InventoryService(this.client);
    this.pricing = new PricingService(this.client);
    this.sales = new SalesService(this.client);
    this.reports = new ReportsService(this.client);
    this.sync = new SyncService(this.client);
  }
}

export * from './client';
export * from '@omnia/shared-types';
```

#### 3.2.5 Usage in Web Frontend

```typescript
// apps/web/lib/api/client.ts
import { OmniaApiClient } from '@omnia/api-client';

export const apiClient = new OmniaApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  getToken: async () => {
    // Web-specific token retrieval
    return localStorage.getItem('access_token');
  },
  onUnauthorized: () => {
    // Redirect to login
    window.location.href = '/login';
  },
});

// Usage in components
const products = await apiClient.products.getAll();
```

#### 3.2.6 Usage in Desktop (via IPC)

```typescript
// apps/desktop/electron/ipc-handlers.ts
import { OmniaApiClient } from '@omnia/api-client';
import { getStoredTokens } from './auth/token-store';

const apiClient = new OmniaApiClient({
  baseURL: process.env.API_URL || 'https://api.production.com/api/v1',
  getToken: async () => {
    const tokens = await getStoredTokens();
    return tokens?.access_token || null;
  },
  environment: 'desktop',
});

// Simplified IPC handler - just proxy to API client
ipcMain.handle('products:getAll', async (_, filters, pagination) => {
  try {
    return await apiClient.products.getAll(filters, pagination);
  } catch (error) {
    // Fallback to local SQLite if offline
    if (!navigator.onLine) {
      return getProductsFromLocalDB(filters, pagination);
    }
    throw error;
  }
});
```

---

### 3.3 Phase 3: Refactor IPC Handlers & Frontend Integration

**Goal:** Simplify IPC handlers and update frontend to use unified API client

#### 3.3.1 Desktop IPC Simplification Strategy

**Current:** 672 lines of mixed-pattern handlers  
**Target:** Thin proxy layer (~150 lines)

**Patterns to implement:**

1. **Online Operations:** Direct proxy to API client
2. **Offline Operations:** Fallback to SQLite + queue for sync
3. **Critical Operations (POS):** Always use SQLite first, sync in background

```typescript
// apps/desktop/electron/ipc-handlers.ts (REFACTORED)
import { ipcMain } from 'electron';
import { apiClient } from './api-client-instance';
import { dbManager } from './database/db-manager';
import { isOnline } from './utils/network';

// ============================================
// PRODUCTS
// ============================================
ipcMain.handle('products:getAll', async (_, filters, pagination) => {
  if (await isOnline()) {
    return apiClient.products.getAll(filters, pagination);
  }
  // Offline fallback
  return dbManager.products.getAll(filters, pagination);
});

ipcMain.handle('products:getByBarcode', async (_, barcode) => {
  // Always check local first for speed (POS requirement)
  const local = await dbManager.products.getByBarcode(barcode);
  if (local) return local;
  
  // Fallback to API if online
  if (await isOnline()) {
    const remote = await apiClient.products.getByBarcode(barcode);
    if (remote) {
      await dbManager.products.upsert(remote); // Cache locally
    }
    return remote;
  }
  
  return null;
});

// ============================================
// SALES (Critical - Always Offline First)
// ============================================
ipcMain.handle('sales:create', async (_, saleData) => {
  // Save to local SQLite immediately
  const sale = await dbManager.sales.create({
    ...saleData,
    synced: false,
    deviceId: await getDeviceId(),
  });
  
  // Queue for background sync
  await syncQueue.add('sale', sale);
  
  return sale;
});

// ============================================
// PRICING (Can use API for calculations)
// ============================================
ipcMain.handle('pricing:calculate', async (_, params) => {
  if (await isOnline()) {
    return apiClient.pricing.calculate(params);
  }
  // Use local calculation logic
  return calculatePriceLocally(params);
});

// ... similar patterns for other modules
```

#### 3.3.2 Web Frontend Refactoring

**Files to update:**

1. **Remove duplicate API client:**
   - Delete: `apps/web/src/lib/api/client.ts` (old axios instance)
   - Delete: `apps/web/src/lib/api/auth.service.ts` (duplicate)
   - Replace with: `@omnia/api-client` import

2. **Update Auth Context:**
   - File: `apps/web/src/contexts/auth-context.tsx`
   - Remove Electron-specific logic
   - Use `apiClient.auth` methods only

3. **Refactor Feature Hooks:**
   - `apps/web/hooks/use-inventory-api.ts`
   - `apps/web/hooks/use-pricing-api.ts`
   - Remove `isElectron()` checks
   - Use `apiClient` directly (works in both environments)

**Example: Refactored Hook**

```typescript
// apps/web/hooks/use-products-api.ts (BEFORE)
export function useProductsAPI() {
  if (!isElectron()) {
    throw new Error('Products API only available in Electron');
  }
  
  const getAll = async () => {
    return window.electron.invoke('products:getAll');
  };
  
  return { getAll };
}

// apps/web/hooks/use-products-api.ts (AFTER)
import { apiClient } from '@/lib/api-client';
import { useState, useCallback } from 'react';

export function useProductsAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const getAll = useCallback(async (filters?, pagination?) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.products.getAll(filters, pagination);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { getAll, loading, error };
}
```

#### 3.3.3 Environment Detection in API Client

The unified API client auto-detects the environment:

- **Web Context:** Uses direct HTTP to backend
- **Desktop Context:** Uses IPC to Electron main process (which uses HTTP)
- **Desktop Offline:** IPC handlers fallback to SQLite

```typescript
// Automatic routing logic (in @omnia/api-client)
class ApiClient {
  private async executeRequest(method, url, data?) {
    const isElectron = typeof window !== 'undefined' && 'electron' in window;
    
    if (isElectron) {
      // Route through IPC
      return window.electron.invoke('api:request', { method, url, data });
    } else {
      // Direct HTTP
      return this.axios.request({ method, url, data });
    }
  }
}
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Shared Types (Est. 3-4 hours)

**Tasks:**
1. Create new type files in `packages/shared-types/src/`
2. Extract DTOs from backend modules
3. Add common types (ApiResponse, Pagination, etc.)
4. Update package exports in `index.ts`
5. Update backend to import from shared types
6. Verify no build errors in backend

**Deliverable:** All modules using `@omnia/shared-types`

### 4.2 Phase 2: API Client Package (Est. 6-8 hours)

**Tasks:**
1. Create new package `packages/api-client/`
2. Implement core `ApiClient` class
3. Create service classes for each module:
   - AuthService
   - ProductsService
   - CategoriesService
   - InventoryService
   - PricingService
   - SalesService
   - ReportsService
   - SyncService
4. Create main `OmniaApiClient` wrapper
5. Add comprehensive JSDoc documentation
6. Test in isolation with mock backend

**Deliverable:** Functional API client package

### 4.3 Phase 3: Integration & Refactoring (Est. 7-8 hours)

**Tasks:**
1. **Desktop:**
   - Simplify IPC handlers to proxy pattern
   - Create `api-client-instance.ts` with config
   - Update database fallback logic
   - Test offline mode thoroughly

2. **Web Frontend:**
   - Remove old API client files
   - Update auth context
   - Refactor feature hooks
   - Update all components using API calls
   - Test login flow

3. **Testing:**
   - Test web→backend flow
   - Test desktop→backend flow (online)
   - Test desktop offline→SQLite fallback
   - Test sync after reconnection
   - Verify POS still works at full speed

**Deliverable:** Fully integrated system with unified API client

---

## 5. Testing Strategy

### 5.1 Unit Tests
- API client methods (mock axios)
- Service classes (mock ApiClient)
- Type validation

### 5.2 Integration Tests
- Web frontend → Backend (online)
- Desktop → Backend (online)
- Desktop → SQLite (offline)
- Sync queue processing

### 5.3 E2E Tests (Critical Paths)
1. **POS Flow:**
   - Scan product (barcode lookup)
   - Add to cart
   - Apply promotion
   - Complete sale
   - Print ticket
   - Verify saved to SQLite
   - Verify synced to backend

2. **Inventory Management:**
   - Create product via web
   - View in desktop
   - Update stock in desktop (offline)
   - Reconnect and sync
   - Verify changes in web

3. **Auth Flow:**
   - Login via web
   - Desktop auto-login
   - Token refresh
   - Logout

---

## 6. Migration Strategy

### 6.1 Incremental Rollout

**Week 1: Types Foundation**
- Deploy shared-types package
- Update backend to use shared types
- No frontend changes yet

**Week 2: API Client Development**
- Develop and test api-client package
- Run in parallel with existing clients (no breaking changes)

**Week 3: Desktop Migration**
- Refactor desktop IPC handlers
- Test thoroughly in staging
- Deploy to production (non-breaking)

**Week 4: Web Migration**
- Refactor web frontend
- Remove old clients
- Final integration testing

### 6.2 Rollback Plan

Each phase is reversible:
- **Phase 1:** Backend can revert to local DTOs
- **Phase 2:** Can continue using old API clients
- **Phase 3:** Can keep old IPC handlers

---

## 7. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking offline mode | High | Medium | Extensive offline testing before deploy |
| Type mismatches | Medium | Low | Strict TypeScript + validation at runtime |
| Performance regression | High | Low | Benchmark POS operations before/after |
| Auth token sync issues | Medium | Medium | Preserve existing token storage logic |
| Sync queue data loss | High | Low | Use transaction-safe SQLite writes |

---

## 8. Success Criteria

✅ **Code Quality:**
- Zero duplicate API client logic
- All API calls use `@omnia/api-client`
- 100% type coverage for API contracts

✅ **Functionality:**
- POS operates at same speed (<300ms barcode scan)
- Offline mode works for at least 8 hours
- Sync completes without data loss
- All existing features work identically

✅ **Developer Experience:**
- New API endpoints require only backend changes
- Types automatically available in frontend
- Clear documentation for adding new modules

---

## 9. Future Enhancements

### 9.1 Auto-generation of Types
- Implement `prisma-generator-nestjs-dto`
- Types update automatically on schema changes

### 9.2 GraphQL Layer (Optional)
- Consider GraphQL for complex queries
- Reduce over-fetching in dashboard

### 9.3 Offline-First Improvements
- Implement CRDT for conflict resolution
- Better sync queue with priorities

### 9.4 Real-time Updates
- WebSocket layer for live dashboard metrics
- Push notifications for stock alerts

---

## 10. Appendix

### 10.1 File Structure Reference

**Packages to Create:**
```
packages/
├── shared-types/          # Phase 1
│   └── src/
│       ├── product.types.ts
│       ├── category.types.ts
│       ├── inventory.types.ts
│       ├── pricing.types.ts
│       ├── sale.types.ts
│       ├── report.types.ts
│       ├── sync.types.ts
│       ├── common.types.ts
│       └── index.ts
│
└── api-client/            # Phase 2
    └── src/
        ├── client.ts
        ├── auth.service.ts
        ├── products.service.ts
        ├── categories.service.ts
        ├── inventory.service.ts
        ├── pricing.service.ts
        ├── sales.service.ts
        ├── reports.service.ts
        ├── sync.service.ts
        └── index.ts
```

**Files to Refactor:**
```
apps/
├── backend/src/           # Phase 1
│   ├── products/dto/      → Delete, use @omnia/shared-types
│   ├── categories/dto/    → Delete, use @omnia/shared-types
│   └── ...                → Same for all modules
│
├── desktop/electron/      # Phase 3
│   ├── ipc-handlers.ts    → Simplify to 150 lines
│   └── api/
│       └── http-client.ts → Delete, use @omnia/api-client
│
└── web/                   # Phase 3
    ├── src/lib/api/
    │   ├── client.ts      → Delete, use @omnia/api-client
    │   └── auth.service.ts → Delete, use @omnia/api-client
    └── hooks/
        ├── use-inventory-api.ts → Refactor to use api-client
        └── use-pricing-api.ts   → Refactor to use api-client
```

### 10.2 Dependencies to Add

```json
// packages/api-client/package.json
{
  "dependencies": {
    "axios": "^1.6.0",
    "@omnia/shared-types": "workspace:*"
  }
}

// apps/web/package.json
{
  "dependencies": {
    "@omnia/api-client": "workspace:*",
    "@omnia/shared-types": "workspace:*"
  }
}

// apps/desktop/package.json (already has shared-types)
{
  "dependencies": {
    "@omnia/api-client": "workspace:*"
  }
}
```

---

**Document End**
