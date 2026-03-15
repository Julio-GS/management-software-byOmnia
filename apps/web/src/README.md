# Source Directory - Feature-Based Architecture

## 🏗️ Estructura del Proyecto

Este proyecto usa **Feature-Based Architecture** (Screaming Architecture), donde cada módulo de negocio es autónomo y contiene todo lo necesario para funcionar.

## 📁 Carpetas Principales

### `/app` - Next.js App Router
- **Responsabilidad**: Solo routing y layouts
- **NO debe contener**: Lógica de negocio, componentes complejos
- **Debe importar**: Desde `/features` y `/shared`

### `/features` - Módulos de Negocio (CORE)
- **Responsabilidad**: Cada feature es autónoma y completa
- **Contiene**: Componentes, hooks, services, types, utils específicos
- **Features actuales**:
  - `pos` - Punto de Venta
  - `inventory` - Gestión de Inventario
  - `dashboard` - Dashboard y Métricas
  - `promotions` - Promociones y Descuentos
  - `reports` - Reportes y Estadísticas
  - `settings` - Configuración del Sistema

### `/shared` - Recursos Compartidos
- **Responsabilidad**: Componentes, hooks, utils usados por múltiples features
- **Regla**: Si 2+ features lo usan, va acá. Si es específico de 1 feature, queda en esa feature

### `/core` - Business Logic (Clean Architecture)
- **Responsabilidad**: Lógica de dominio pura, independiente de frameworks
- **Contiene**:
  - `entities` - Modelos de dominio
  - `use-cases` - Casos de uso de negocio
  - `ports` - Interfaces (Hexagonal Architecture)

### `/infrastructure` - Adaptadores Externos
- **Responsabilidad**: Implementaciones de servicios externos
- **Contiene**:
  - `api` - Cliente HTTP, endpoints
  - `storage` - LocalStorage, IndexedDB
  - `state` - State management global

### `/config` - Configuraciones
- **Responsabilidad**: Constantes globales, env vars, theme

---

## 🎯 Reglas de Oro

1. **Feature Independence**: Cada feature NO debe importar de otras features
2. **Shared is Sacred**: Solo componentes REALMENTE compartidos van a `/shared`
3. **Core is Pure**: `/core` NO debe importar de React, Next.js o cualquier framework
4. **Infrastructure Implements Ports**: Los adapters en `/infrastructure` implementan interfaces de `/core/ports`
5. **App Router is Thin**: `/app` solo hace routing, importa componentes de features

---

## 📚 Ejemplo de Import Flow

```typescript
// ✅ CORRECTO
// app/(dashboard)/pos/page.tsx
import { PosView } from '@/features/pos/components/pos-view'

// features/pos/components/pos-view.tsx
import { useCart } from '@/features/pos/hooks/use-cart'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/utils/format'

// ❌ INCORRECTO
// features/pos/hooks/use-cart.ts
import { useInventory } from '@/features/inventory/hooks/use-inventory' // NO! Features no deben depender entre sí

// core/entities/product.entity.ts
import { useEffect } from 'react' // NO! Core no debe usar React
```

---

## 🚀 Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/core/*": ["./src/core/*"],
      "@/infrastructure/*": ["./src/infrastructure/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

---

**Autor**: Omnia Build Studio  
**Arquitectura**: Feature-Based + Clean Architecture + Hexagonal Architecture  
**Stack**: Next.js 16, React 19, TypeScript 5.7
