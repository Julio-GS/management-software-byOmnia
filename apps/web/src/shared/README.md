# Shared Directory

## 🎯 Propósito

Recursos **verdaderamente compartidos** entre múltiples features. Si solo UNA feature lo usa, NO va acá.

## 📦 Estructura

```
shared/
├── components/           # Componentes UI reutilizables
│   ├── ui/              # Shadcn/ui components
│   ├── layout/          # Layouts (Sidebar, Header, Footer)
│   └── common/          # Componentes custom compartidos
├── hooks/               # Hooks genéricos
├── types/               # Types globales
├── utils/               # Utilidades genéricas
└── constants/           # Constantes globales
```

## 🧩 Subcarpetas

### `/components/ui`
Componentes de Shadcn/ui sin modificar.
- **Ejemplos**: `button.tsx`, `dialog.tsx`, `table.tsx`
- **Regla**: NO modificar, si necesitas custom, crea en `/common`

### `/components/layout`
Layouts y navegación global.
- **Ejemplos**: `app-sidebar.tsx`, `app-header.tsx`
- **Usado por**: Todas las páginas

### `/components/common`
Componentes custom reutilizables.
- **Ejemplos**: `data-table.tsx`, `stats-card.tsx`, `empty-state.tsx`
- **Regla**: Debe ser usado por 2+ features

### `/hooks`
Hooks genéricos no acoplados a features.
- **Ejemplos**: `use-mobile.ts`, `use-toast.ts`, `use-local-storage.ts`
- **NO debe contener**: Lógica de negocio específica

### `/types`
Types compartidos entre features.
- **Ejemplos**: `api.types.ts`, `common.types.ts`
- **Contiene**: Response types, pagination, errors

### `/utils`
Utilidades genéricas.
- **Ejemplos**: `cn.ts` (classnames), `format.ts`, `validators.ts`
- **Regla**: Funciones puras, sin dependencias de features

### `/constants`
Constantes globales.
- **Ejemplos**: `routes.ts`, `config.ts`, `api-endpoints.ts`

---

## ✅ Qué SÍ va en Shared

```typescript
// ✅ Componente usado por 3+ features
// shared/components/common/stats-card.tsx
export function StatsCard({ title, value, icon }) {
  return <Card>...</Card>
}

// ✅ Hook genérico
// shared/hooks/use-local-storage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Generic localStorage hook
}

// ✅ Utilidad de formateo
// shared/utils/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS' 
  }).format(amount)
}

// ✅ Constantes de rutas
// shared/constants/routes.ts
export const ROUTES = {
  DASHBOARD: '/',
  POS: '/pos',
  INVENTORY: '/inventario',
} as const
```

## ❌ Qué NO va en Shared

```typescript
// ❌ Lógica específica de POS
// NO! Esto debe ir en features/pos/utils/
export function calculatePOSDiscount(item: CartItem) {
  // Específico de POS, no compartido
}

// ❌ Hook con lógica de negocio de Inventory
// NO! Esto debe ir en features/inventory/hooks/
export function useInventoryAlerts() {
  // Específico de inventory
}

// ❌ Componente que solo usa Reports
// NO! Debe ir en features/reports/components/
export function SalesChart() {
  // Solo usado por reports
}
```

---

## 🔄 Cuándo Mover a Shared

**Regla de los 3**:
1. Lo usas en 1 feature → Queda en esa feature
2. Lo necesitas en 2 features → Evalúa si realmente es compartido o son casos distintos
3. Lo usas en 3+ features → AHORA sí, muévelo a shared

**Ejemplo real**:

```typescript
// Paso 1: Está en features/pos/utils/format.ts
export function formatCurrency(amount: number) { }

// Paso 2: Inventory también lo necesita
// ❌ NO copies el código
import { formatCurrency } from '@/features/pos/utils/format' // ❌ Features no deben importar entre sí

// ✅ Muévelo a shared
// shared/utils/format.ts
export function formatCurrency(amount: number) { }

// Ahora ambas features importan de shared
import { formatCurrency } from '@/shared/utils/format' // ✅
```

---

## 📐 Principio DRY vs Premature Abstraction

**DRY (Don't Repeat Yourself)**: No dupliques código.

**Premature Abstraction**: No generalices demasiado pronto.

### Ejemplo de código similar pero NO duplicado:

```typescript
// features/pos/utils/cart-calculator.ts
export function calculateCartTotal(items: CartItem[]) {
  // Suma items del carrito con descuentos de POS
  return items.reduce((acc, item) => {
    const discount = calculatePOSDiscount(item) // Lógica específica POS
    return acc + (item.price * item.quantity) - discount
  }, 0)
}

// features/inventory/utils/stock-calculator.ts
export function calculateStockValue(products: Product[]) {
  // Suma valor del stock
  return products.reduce((acc, product) => {
    return acc + (product.cost * product.quantity)
  }, 0)
}
```

**¿Son parecidos? Sí.**  
**¿Son duplicados? NO.**  
**¿Deberían compartirse? NO.**  

Tienen lógicas de negocio diferentes aunque usen `.reduce()`. La abstracción forzada sería peor que mantenerlos separados.

---

## 🎨 Componentes Shadcn/ui

Los componentes de Shadcn viven en `shared/components/ui/` y **NUNCA** se modifican directamente.

**Si necesitas customizar un componente Shadcn:**

```typescript
// ❌ NO modifiques shared/components/ui/button.tsx

// ✅ Crea un wrapper en shared/components/common/
// shared/components/common/action-button.tsx
import { Button } from '@/shared/components/ui/button'

export function ActionButton({ children, ...props }) {
  return (
    <Button className="custom-styles" {...props}>
      {children}
    </Button>
  )
}
```

---

**Última actualización**: 26 Feb 2026
