# Infrastructure Directory - External Adapters

## 🎯 Propósito

Implementaciones **concretas** de los ports definidos en `/core/ports`. Acá vive todo lo que se conecta con el mundo exterior.

**Filosofía**: "Todo lo que puede fallar o cambiar va acá"

## 📦 Estructura

```
infrastructure/
├── api/              # Cliente HTTP y endpoints
├── storage/          # LocalStorage, IndexedDB, SessionStorage
└── state/            # State management global (Zustand)
```

---

## 🌐 API Directory

Configuración y adaptadores para comunicación HTTP.

### Estructura Recomendada

```
infrastructure/api/
├── client.ts              # Axios/Fetch config
├── endpoints.ts           # API endpoint URLs
├── interceptors.ts        # Request/Response interceptors
└── adapters/              # Implementaciones de ports
    ├── sale.repository.impl.ts
    ├── product.repository.impl.ts
    └── payment.service.impl.ts
```

### Ejemplo: API Client

```typescript
// infrastructure/api/client.ts

import axios, { type AxiosInstance } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Ejemplo: Repository Implementation

```typescript
// infrastructure/api/adapters/sale.repository.impl.ts

import type { SaleRepository, Sale } from '@/core/ports/repositories/sale.repository'
import type { Product } from '@/core/entities/product.entity'
import { apiClient } from '../client'

export class ApiSaleRepository implements SaleRepository {
  async create(sale: Omit<Sale, 'id'>): Promise<Sale> {
    const response = await apiClient.post<Sale>('/sales', sale)
    return response.data
  }

  async findById(id: string): Promise<Sale | null> {
    try {
      const response = await apiClient.get<Sale>(`/sales/${id}`)
      return response.data
    } catch (error) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async findByCustomerId(customerId: string): Promise<Sale[]> {
    const response = await apiClient.get<Sale[]>('/sales', {
      params: { customerId },
    })
    return response.data
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${productId}`)
    return response.data
  }

  async decreaseStock(productId: string, quantity: number): Promise<void> {
    await apiClient.patch(`/products/${productId}/stock`, {
      operation: 'decrease',
      quantity,
    })
  }
}
```

---

## 💾 Storage Directory

Adaptadores para persistencia local (navegador).

### Estructura

```
infrastructure/storage/
├── local-storage.adapter.ts
├── indexed-db.adapter.ts
└── session-storage.adapter.ts
```

### Ejemplo: LocalStorage Adapter

```typescript
// infrastructure/storage/local-storage.adapter.ts

export class LocalStorageAdapter<T> {
  constructor(private readonly key: string) {}

  get(): T | null {
    try {
      const item = localStorage.getItem(this.key)
      if (!item) return null
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Error reading from localStorage (${this.key}):`, error)
      return null
    }
  }

  set(value: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage (${this.key}):`, error)
      throw new Error('Storage quota exceeded')
    }
  }

  remove(): void {
    localStorage.removeItem(this.key)
  }

  clear(): void {
    localStorage.clear()
  }
}

// Usage
export const cartStorage = new LocalStorageAdapter<CartItem[]>('cart')
export const userPrefsStorage = new LocalStorageAdapter<UserPreferences>('user-prefs')
```

### Ejemplo: IndexedDB Adapter (para grandes volúmenes)

```typescript
// infrastructure/storage/indexed-db.adapter.ts

export class IndexedDBAdapter {
  private db: IDBDatabase | null = null
  private readonly dbName = 'omnia-pos-db'
  private readonly version = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' })
          salesStore.createIndex('customerId', 'customerId', { unique: false })
          salesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' })
        }
      }
    })
  }

  async save<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
}

export const indexedDB = new IndexedDBAdapter()
```

---

## 🗄️ State Directory

State management global con Zustand.

### Estructura

```
infrastructure/state/
├── global-store.ts           # Store global (user, theme, etc.)
└── middleware/               # Persistence, logging, etc.
    ├── persist.middleware.ts
    └── logger.middleware.ts
```

### Ejemplo: Global Store

```typescript
// infrastructure/state/global-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'cashier' | 'manager'
}

interface GlobalState {
  // User
  user: User | null
  setUser: (user: User | null) => void
  
  // Theme
  theme: 'light' | 'dark'
  toggleTheme: () => void
  
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),
      
      // Theme
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'omnia-global-storage',
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        // NO persistimos notifications
      }),
    }
  )
)
```

---

## 🔌 Dependency Injection

Para usar los adapters en los use cases, podemos hacer Dependency Injection manual:

```typescript
// features/pos/hooks/use-process-sale.ts

import { ProcessSaleUseCase } from '@/core/use-cases/process-sale.use-case'
import { ApiSaleRepository } from '@/infrastructure/api/adapters/sale.repository.impl'
import { PaymentServiceImpl } from '@/infrastructure/api/adapters/payment.service.impl'
import { InvoiceServiceImpl } from '@/infrastructure/api/adapters/invoice.service.impl'

export function useProcessSale() {
  // Dependency Injection manual
  const saleRepository = new ApiSaleRepository()
  const paymentService = new PaymentServiceImpl()
  const invoiceService = new InvoiceServiceImpl()

  const processSaleUseCase = new ProcessSaleUseCase(
    saleRepository,
    paymentService,
    invoiceService
  )

  const processSale = async (input) => {
    return await processSaleUseCase.execute(input)
  }

  return { processSale }
}
```

O con un **DI Container** más sofisticado si el proyecto crece.

---

## 🧪 Testing Adapters

Los adapters se testean con **mocks de las APIs externas**:

```typescript
// sale.repository.impl.test.ts

import { ApiSaleRepository } from './sale.repository.impl'
import { apiClient } from '../client'

jest.mock('../client')

describe('ApiSaleRepository', () => {
  it('should create a sale', async () => {
    const mockSale = { id: '1', total: 1000 }
    ;(apiClient.post as jest.Mock).mockResolvedValue({ data: mockSale })

    const repository = new ApiSaleRepository()
    const result = await repository.create({ total: 1000 })

    expect(result).toEqual(mockSale)
    expect(apiClient.post).toHaveBeenCalledWith('/sales', { total: 1000 })
  })
})
```

---

**Última actualización**: 26 Feb 2026
