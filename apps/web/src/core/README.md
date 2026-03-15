# Core Directory - Business Logic

## 🎯 Propósito

Lógica de **dominio pura** independiente de frameworks. Este código debería funcionar sin React, sin Next.js, sin nada.

**Filosofía**: "Si elimino React y Next.js del proyecto, este código sigue funcionando"

## 📦 Estructura

```
core/
├── entities/              # Modelos de dominio (Plain Objects)
├── use-cases/             # Casos de uso de negocio
└── ports/                 # Interfaces (Hexagonal Architecture)
    ├── repositories/      # Interfaces de persistencia
    └── services/          # Interfaces de servicios externos
```

## 🧱 Entities (Domain Models)

**Qué son**: Representación de conceptos del negocio.

**Reglas**:
- Plain Objects o Classes (sin decoradores de frameworks)
- Solo lógica de negocio pura
- NO dependencias de React, Next.js, Zustand, etc.

### Ejemplo: Product Entity

```typescript
// core/entities/product.entity.ts

export class Product {
  constructor(
    public readonly id: string,
    public readonly barcode: string,
    public readonly name: string,
    public readonly price: number,
    public readonly cost: number,
    public readonly stock: number,
    public readonly minStock: number,
    public readonly category: string,
    public readonly expirationDate?: Date
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.price < 0) {
      throw new Error('Price cannot be negative')
    }
    if (this.stock < 0) {
      throw new Error('Stock cannot be negative')
    }
    if (this.price < this.cost) {
      console.warn(`Product ${this.name} is selling below cost`)
    }
  }

  get isLowStock(): boolean {
    return this.stock <= this.minStock
  }

  get isExpiringSoon(): boolean {
    if (!this.expirationDate) return false
    const daysUntilExpiration = this.getDaysUntilExpiration()
    return daysUntilExpiration > 0 && daysUntilExpiration <= 7
  }

  get isExpired(): boolean {
    if (!this.expirationDate) return false
    return this.expirationDate < new Date()
  }

  private getDaysUntilExpiration(): number {
    if (!this.expirationDate) return Infinity
    const now = new Date()
    const diff = this.expirationDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  calculateProfit(): number {
    return this.price - this.cost
  }

  calculateProfitMargin(): number {
    return ((this.price - this.cost) / this.price) * 100
  }
}
```

## 🎬 Use Cases (Application Logic)

**Qué son**: Flujos de negocio, orquestación de entities y servicios.

**Reglas**:
- Casos de uso específicos del negocio
- Usan entities y ports
- NO conocen implementaciones concretas (usan interfaces)

### Ejemplo: Process Sale Use Case

```typescript
// core/use-cases/process-sale.use-case.ts

import { Product } from '../entities/product.entity'
import type { SaleRepository } from '../ports/repositories/sale.repository'
import type { PaymentService } from '../ports/services/payment.service'
import type { InvoiceService } from '../ports/services/invoice.service'

export interface ProcessSaleInput {
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: 'cash' | 'card' | 'transfer'
  customerId?: string
}

export interface ProcessSaleOutput {
  saleId: string
  invoiceNumber: string
  total: number
  success: boolean
}

export class ProcessSaleUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService
  ) {}

  async execute(input: ProcessSaleInput): Promise<ProcessSaleOutput> {
    // 1. Validar stock
    await this.validateStock(input.items)

    // 2. Calcular total
    const total = await this.calculateTotal(input.items)

    // 3. Procesar pago
    const paymentResult = await this.paymentService.process({
      amount: total,
      method: input.paymentMethod,
    })

    if (!paymentResult.success) {
      throw new Error('Payment failed')
    }

    // 4. Crear venta
    const sale = await this.saleRepository.create({
      items: input.items,
      total,
      paymentId: paymentResult.id,
      customerId: input.customerId,
      timestamp: new Date(),
    })

    // 5. Generar factura
    const invoice = await this.invoiceService.generate({
      saleId: sale.id,
      items: input.items,
      total,
    })

    // 6. Descontar stock
    await this.updateStock(input.items)

    return {
      saleId: sale.id,
      invoiceNumber: invoice.number,
      total,
      success: true,
    }
  }

  private async validateStock(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    // Validación de stock
    for (const item of items) {
      const product = await this.saleRepository.getProduct(item.productId)
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`)
      }
    }
  }

  private async calculateTotal(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<number> {
    let total = 0
    for (const item of items) {
      const product = await this.saleRepository.getProduct(item.productId)
      total += product.price * item.quantity
    }
    return total
  }

  private async updateStock(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    for (const item of items) {
      await this.saleRepository.decreaseStock(item.productId, item.quantity)
    }
  }
}
```

## 🔌 Ports (Interfaces - Hexagonal Architecture)

**Qué son**: Contratos que definen cómo el core se comunica con el exterior.

**Reglas**:
- Solo interfaces (TypeScript) o abstract classes
- NO implementaciones concretas
- Las implementaciones van en `/infrastructure`

### Ejemplo: Repository Port

```typescript
// core/ports/repositories/sale.repository.ts

import type { Product } from '../../entities/product.entity'

export interface Sale {
  id: string
  items: Array<{ productId: string; quantity: number; price: number }>
  total: number
  paymentId: string
  customerId?: string
  timestamp: Date
}

export interface SaleRepository {
  create(sale: Omit<Sale, 'id'>): Promise<Sale>
  findById(id: string): Promise<Sale | null>
  findByCustomerId(customerId: string): Promise<Sale[]>
  getProduct(productId: string): Promise<Product>
  decreaseStock(productId: string, quantity: number): Promise<void>
}
```

### Ejemplo: Service Port

```typescript
// core/ports/services/payment.service.ts

export interface ProcessPaymentInput {
  amount: number
  method: 'cash' | 'card' | 'transfer'
  metadata?: Record<string, any>
}

export interface ProcessPaymentOutput {
  id: string
  success: boolean
  transactionId?: string
  error?: string
}

export interface PaymentService {
  process(input: ProcessPaymentInput): Promise<ProcessPaymentOutput>
  refund(paymentId: string): Promise<boolean>
  getStatus(paymentId: string): Promise<'pending' | 'completed' | 'failed'>
}
```

---

## 🔄 Flujo de Dependencias

```
┌─────────────────────────────────────────────┐
│            features/pos                      │
│  ┌───────────────────────────────────────┐  │
│  │  components/pos-view.tsx              │  │
│  │  (UI Layer)                           │  │
│  └─────────────┬─────────────────────────┘  │
│                ↓                             │
│  ┌───────────────────────────────────────┐  │
│  │  hooks/use-process-sale.ts            │  │
│  │  (Hook que usa Use Case)              │  │
│  └─────────────┬─────────────────────────┘  │
└────────────────┼─────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│            core/use-cases                    │
│  ┌───────────────────────────────────────┐  │
│  │  process-sale.use-case.ts             │  │
│  │  (Business Logic)                     │  │
│  └─────────────┬─────────────────────────┘  │
│                ↓                             │
│  ┌───────────────────────────────────────┐  │
│  │  ports/repositories/sale.repository   │  │
│  │  (Interface)                          │  │
│  └─────────────┬─────────────────────────┘  │
└────────────────┼─────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│         infrastructure/storage               │
│  ┌───────────────────────────────────────┐  │
│  │  sale.repository.impl.ts              │  │
│  │  (Concrete Implementation)            │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## ❌ Qué NO debe haber en /core

```typescript
// ❌ NO imports de React
import { useState } from 'react'

// ❌ NO imports de Next.js
import { useRouter } from 'next/navigation'

// ❌ NO imports de Zustand u otros state managers
import { create } from 'zustand'

// ❌ NO imports de componentes UI
import { Button } from '@/shared/components/ui/button'

// ❌ NO fetch/axios directo (usar ports)
const response = await fetch('/api/products')

// ❌ NO localStorage directo (usar ports)
localStorage.setItem('cart', JSON.stringify(cart))
```

## ✅ Qué SÍ puede haber en /core

```typescript
// ✅ Pure functions
export function calculateTax(amount: number, rate: number): number {
  return amount * rate
}

// ✅ Classes con lógica de negocio
export class ShoppingCart {
  private items: CartItem[] = []
  
  addItem(item: CartItem): void {
    this.items.push(item)
  }
  
  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0)
  }
}

// ✅ Interfaces
export interface Product {
  id: string
  name: string
  price: number
}

// ✅ Enums
export enum PaymentMethod {
  Cash = 'CASH',
  Card = 'CARD',
  Transfer = 'TRANSFER',
}
```

---

## 🧪 Testing

El código en `/core` es el **MÁS FÁCIL DE TESTEAR** porque no tiene dependencias externas.

```typescript
// product.entity.test.ts
import { Product } from './product.entity'

describe('Product Entity', () => {
  it('should detect low stock', () => {
    const product = new Product(
      '1',
      '123',
      'Test Product',
      100,
      50,
      5,  // stock
      10, // minStock
      'category'
    )
    
    expect(product.isLowStock).toBe(true)
  })
  
  it('should calculate profit correctly', () => {
    const product = new Product('1', '123', 'Test', 100, 60, 10, 5, 'cat')
    expect(product.calculateProfit()).toBe(40)
  })
})
```

---

**Última actualización**: 26 Feb 2026
