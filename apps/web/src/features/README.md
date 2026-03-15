# Features Directory

## 🎯 Propósito

Cada carpeta dentro de `/features` representa un **módulo de negocio autónomo** con toda su funcionalidad encapsulada.

## 📦 Estructura de una Feature

```
features/
└── pos/                          # Nombre de la feature
    ├── components/               # Componentes UI específicos de POS
    │   ├── cart/                 # Subgrupos por dominio
    │   │   ├── cart-table.tsx
    │   │   ├── cart-summary.tsx
    │   │   └── cart-item-row.tsx
    │   ├── payment/
    │   ├── tickets/
    │   └── pos-view.tsx          # Componente principal (orquestador)
    ├── hooks/                    # Custom hooks específicos
    │   ├── use-cart.ts
    │   ├── use-tickets.ts
    │   └── use-payment.ts
    ├── services/                 # Lógica de negocio & API calls
    │   ├── cart.service.ts
    │   ├── product.service.ts
    │   └── payment.service.ts
    ├── store/                    # Estado local (Zustand/Jotai)
    │   └── pos-store.ts
    ├── types/                    # TypeScript types específicos
    │   └── index.ts
    ├── utils/                    # Utilidades específicas
    │   ├── currency.ts
    │   └── discount-calculator.ts
    └── index.ts                  # Public API (barrel export)
```

## 🚫 Reglas Estrictas

### ✅ Permitido

```typescript
// ✅ Importar desde shared
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/utils/format'

// ✅ Importar desde core
import { Product } from '@/core/entities/product.entity'

// ✅ Importar desde infrastructure
import { apiClient } from '@/infrastructure/api/client'

// ✅ Importar dentro de la misma feature
import { useCart } from '../hooks/use-cart'
```

### ❌ Prohibido

```typescript
// ❌ NO importar de otras features
import { useInventory } from '@/features/inventory/hooks/use-inventory'

// ❌ NO circular dependencies
// features/pos -> features/inventory -> features/pos
```

## 📝 Convenciones de Naming

- **Componentes**: PascalCase + descriptivo (`CartTable`, `PaymentDialog`)
- **Hooks**: camelCase + prefijo `use` (`useCart`, `usePayment`)
- **Services**: camelCase + sufijo `.service.ts` (`cart.service.ts`)
- **Types**: PascalCase + sufijo para interfaces (`CartItem`, `PaymentMethod`)
- **Utils**: camelCase + descriptivo (`calculateDiscount`, `formatTaxId`)

## 🏗️ Features Actuales

### `pos` - Punto de Venta
Sistema completo de punto de venta con:
- Carrito de compras multi-producto
- Multi-ticket (compras separadas)
- Métodos de pago combinados
- Notas de crédito
- Descuentos y promociones

### `inventory` - Gestión de Inventario
Control de stock:
- ABM de productos
- Control de stock mínimo
- Alertas de vencimiento
- Gestión de proveedores

### `dashboard` - Dashboard Principal
Métricas y KPIs:
- Ventas del día
- Transacciones
- Ticket promedio
- Alertas críticas

### `promotions` - Promociones
Sistema de descuentos:
- 2x1, 3x2
- Descuentos porcentuales
- Promociones por fecha
- Cupones

### `reports` - Reportes
Informes y estadísticas:
- Ventas por período
- Productos más vendidos
- Análisis de rentabilidad
- Exportación a Excel/PDF

### `settings` - Configuración
Ajustes del sistema:
- Configuración de caja
- Usuarios y permisos
- Impresoras fiscales
- Integración AFIP

---

## 🎓 Ejemplo Completo: Feature POS

**Objetivo**: Mostrar como crear una feature completa

### 1. Definir Types (`types/index.ts`)

```typescript
export interface CartItem {
  id: string
  productId: string
  name: string
  unitPrice: number
  quantity: number
  discount?: Discount
}

export interface Ticket {
  id: string
  items: CartItem[]
  total: number
}
```

### 2. Crear Service (`services/cart.service.ts`)

```typescript
import type { CartItem } from '../types'

export const cartService = {
  calculateSubtotal: (items: CartItem[]): number => {
    return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  },
  
  applyDiscount: (item: CartItem): number => {
    // Lógica de descuento
  }
}
```

### 3. Crear Hook (`hooks/use-cart.ts`)

```typescript
import { useState } from 'react'
import type { CartItem } from '../types'
import { cartService } from '../services/cart.service'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  
  const addItem = (item: CartItem) => {
    setItems(prev => [...prev, item])
  }
  
  const total = cartService.calculateSubtotal(items)
  
  return { items, addItem, total }
}
```

### 4. Crear Componente (`components/cart/cart-table.tsx`)

```typescript
import { useCart } from '../../hooks/use-cart'
import { Table } from '@/shared/components/ui/table'
import { formatCurrency } from '@/shared/utils/format'

export function CartTable() {
  const { items, total } = useCart()
  
  return (
    <Table>
      {/* Render items */}
      <div>Total: {formatCurrency(total)}</div>
    </Table>
  )
}
```

### 5. Exportar Public API (`index.ts`)

```typescript
// Components
export { PosView } from './components/pos-view'
export { CartTable } from './components/cart/cart-table'

// Hooks
export { useCart } from './hooks/use-cart'

// Types (si otras features necesitan importarlos, pero generalmente NO)
export type { CartItem, Ticket } from './types'
```

---

**Documentación actualizada**: 26 Feb 2026
