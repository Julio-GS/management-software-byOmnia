# 🎯 ROADMAP: OMNIA MANAGEMENT SYSTEM (14 DÍAS)

## FASE 0: SETUP Y FUNDACIONES (Días 1-2)

### Día 1: Backend + Base de Datos

**Objetivo:** Tener NestJS corriendo con PostgreSQL y los modelos básicos.

**Tareas:**

1. ✅ Inicializar proyecto NestJS con arquitectura modular.
2. ✅ Configurar PostgreSQL en Railway (dev + producción).
3. ✅ Instalar TypeORM/Prisma (recomiendo Prisma por velocidad).
4. ✅ Crear módulos base: `products`, `sales`, `inventory`, `sync`.
5. ✅ Modelar entidades críticas:
   - `Product` (`barcode`, `name`, `cost`, `markup`, `price`, `iva`, `category_id`)
   - `Category` (`name`, `default_markup`, `iva_rate`)
   - `Sale` (`device_id`, `items`, `total`, `synced_at`, `cae_number`)
   - `SyncLog` (`device_id`, `entity`, `operation`, `timestamp`)
6. ✅ Crear endpoints CRUD básicos para productos.
7. ✅ Configurar JWT Auth simple (usuario admin hardcoded por ahora).

**Entregable:** Backend corriendo en Railway con endpoints testeables en Postman.

---

### Día 2: Electron + SQLite Local

**Objetivo:** Tener Electron empaquetando Next.js con SQLite funcional.

**Tareas:**

1. ✅ Instalar `electron` + `electron-builder`.
2. ✅ Configurar `electron/main.ts` con IPC handlers.
3. ✅ Instalar `better-sqlite3` y configurar DB local.
4. ✅ Crear schema SQLite espejo del PostgreSQL.
5. ✅ Implementar IPC para:
   - `db:query` (ejecutar queries desde el renderer)
   - `scanner:read` (emular input del scanner)
   - `printer:print` (placeholder para Hasar)
6. ✅ Probar que Next.js se renderice dentro de Electron.
7. ✅ Crear script `dev:electron` para desarrollo.

**Entregable:** Aplicación Electron ejecutándose con Next.js y SQLite funcional.

---

## FASE 1: POS CORE (Días 3-6)

### Día 3: UI del POS + Lógica de Carrito

**Objetivo:** Pantalla de POS funcional sin backend.

**Tareas:**

1. ✅ Rediseñar `pos-view.tsx` con componentes reales.
2. ✅ Implementar estado del carrito (Zustand o Context).
3. ✅ Crear componente `ProductScanner` que escuche IPC.
4. ✅ Calcular subtotales, IVA y total en tiempo real.
5. ✅ Implementar botones: agregar manual, quitar, limpiar carrito.
6. ✅ Mostrar productos en lista con cantidad y precio.

**Entregable:** POS funcional con productos mockeados localmente.

---

### Día 4: Integración Scanner + Promociones Simples

**Objetivo:** Escanear productos reales desde SQLite y aplicar 2x1.

**Tareas:**

1. ✅ Configurar Scanner Gadnic como Keyboard Wedge (testear físicamente).
2. ✅ Implementar lookup de productos por `barcode` en SQLite.
3. ✅ Crear tabla `promotions` en SQLite:

```sql
CREATE TABLE promotions (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  type TEXT, -- '2x1', '3x2'
  active BOOLEAN
);
```

4. ✅ Implementar lógica de promociones en `calculateCart`:
   - Detectar si hay promoción activa.
   - Aplicar descuento automáticamente.
   - Mostrar en UI qué productos tienen promo.
5. ✅ IPC `promotion:calculate` que devuelve carrito con descuentos.

**Entregable:** POS que escanea productos y aplica 2x1 automáticamente.

---

### Día 5: Impresión de Tickets (Hasar ESC/POS)

**Objetivo:** Imprimir tickets físicos al finalizar venta.

**Tareas:**

1. ✅ Investigar protocolo ESC/POS de Hasar (modelo específico).
2. ✅ Instalar librería `escpos` o `node-thermal-printer`.
3. ✅ Crear `printer.service.ts` en Electron main process.
4. ✅ Implementar IPC `printer:printTicket` con datos de venta.
5. ✅ Diseñar template de ticket:
   - Encabezado (nombre del negocio).
   - Productos con cantidad, precio unitario, subtotal.
   - Total, descuentos, IVA.
   - Footer con “Remito Interno” o CAE.
6. ✅ Probar impresión física con la Hasar.

**Entregable:** POS que imprime tickets físicos al confirmar venta.

---

### Día 6: Persistencia Local de Ventas

**Objetivo:** Guardar ventas en SQLite para sincronizar después.

**Tareas:**

1. ✅ Crear tabla `sales` en SQLite:

```sql
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  device_id TEXT,
  items JSON,
  total REAL,
  created_at TEXT,
  synced BOOLEAN DEFAULT 0,
  cae TEXT
);
```

2. ✅ Al confirmar venta:
   - Guardar en SQLite.
   - Imprimir ticket.
   - Decrementar stock local.
   - Limpiar carrito.
3. ✅ Crear pantalla de “Ventas Pendientes de Sync”.
4. ✅ Generar `device_id` único por instalación.

**Entregable:** POS que guarda ventas offline completamente funcional.

---

## FASE 2: DASHBOARD + GESTIÓN (Días 7-9)

### Día 7: CRUD de Productos (Frontend)

**Objetivo:** Interfaz para dar de alta productos con márgenes.

**Tareas:**

1. ✅ Rediseñar `inventory-view.tsx` con tabla real.
2. ✅ Crear formulario de alta de producto:
   - Código de barras (input manual + escanear).
   - Nombre, descripción.
   - Categoría (select).
   - Costo (input).
   - Modo: Markup vs Precio Final.
   - Margen específico (opcional).
3. ✅ Implementar tabla con `@tanstack/react-table`.
4. ✅ Acciones: editar, eliminar (soft delete).
5. ✅ Conectar con backend NestJS vía `fetch`/`axios`.

**Entregable:** Dashboard para gestionar productos completo.

---

### Día 8: Lógica de Márgenes y Cálculos

**Objetivo:** Implementar jerarquía de markup y cálculo reverso de IVA.

**Tareas:**

1. ✅ En backend, crear `pricing.service.ts`:
   - `calculatePrice(cost, markup, iva_rate) → final_price`
   - `reversePrice(final_price, iva_rate) → cost_without_iva, markup`
2. ✅ Implementar jerarquía:
   - Si producto tiene markup → usar ese.
   - Si no, usar markup de categoría.
   - Si no, usar markup global.
3. ✅ Crear endpoint `GET /pricing/calculate?cost=100&category_id=2`.
4. ✅ En frontend, mostrar preview del precio mientras se escribe.
5. ✅ Crear tabla `categories` con markups por defecto.

**Entregable:** Sistema de precios inteligente funcionando.

---

### Día 9: Gestión de Categorías + Configuración Global

**Objetivo:** Pantalla de ajustes para configurar márgenes y parámetros.

**Tareas:**

1. ✅ Rediseñar `ajustes-view.tsx` con secciones:
   - Margen global.
   - Categorías (CRUD inline).
   - Configuración de impresora.
   - Datos fiscales (CUIT, razón social).
2. ✅ Crear endpoint `GET/PUT /settings` en backend.
3. ✅ Guardar settings en tabla `app_settings` (key-value).
4. ✅ Sincronizar settings entre SQLite y PostgreSQL.

**Entregable:** Panel de configuración completo.

---

## FASE 3: SINCRONIZACIÓN + AFIP (Días 10-12)

### Día 10: Background Worker de Sincronización

**Objetivo:** Subir ventas offline y bajar cambios de precios.

**Tareas:**

1. ✅ Crear `sync.worker.ts` en Electron con `setInterval(30000)`.
2. ✅ Implementar `syncOut` (subir ventas):
   - Query: `SELECT * FROM sales WHERE synced = 0`
   - POST a `/sales/bulk` en NestJS.
   - Marcar como `synced = 1` al confirmar.
3. ✅ Implementar `syncIn` (bajar productos):
   - GET `/products/delta?since=last_sync_timestamp`
   - UPDATE/INSERT en SQLite.
4. ✅ Crear endpoint `/sync/delta` que devuelve cambios desde timestamp.
5. ✅ Mostrar indicador de sync en UI (online/offline).
6. ✅ Manejar conflictos: priorizar siempre datos de la nube.

**Entregable:** Sincronización bidireccional automática.

---

### Día 11: Integración AFIP (CAE para Facturas)

**Objetivo:** Emitir facturas electrónicas con CAE real.

**Tareas:**

1. ✅ Investigar SDK de AFIP (`@afipsdk/afip.js` o similar).
2. ✅ Configurar certificado digital en Railway (variables de entorno).
3. ✅ Crear `afip.service.ts` en backend:
   - `requestCAE(sale_data) → { cae, cae_due_date }`
4. ✅ Modificar flujo de venta:
   - Al sincronizar venta, intentar obtener CAE.
   - Si falla, marcar como `cae_pending = true`.
   - Reintentar automáticamente cada 5 minutos.
5. ✅ Actualizar ticket impreso con CAE cuando se obtenga.
6. ✅ Crear endpoint `/sales/:id/regenerate-ticket` para reimprimir.

**Entregable:** Facturación electrónica funcional con CAE.

---

### Día 12: Modo Offline AFIP + Email Fallback

**Objetivo:** Resiliencia total ante fallas.

**Tareas:**

1. ✅ Implementar lógica:

```ts
if (online && afip_available) {
  // Factura con CAE
} else {
  // Remito Interno (guardar como pendiente)
}
```

2. ✅ Configurar Resend para envío de tickets por email.
3. ✅ Crear `email.service.ts`:
   - Template HTML del ticket.
   - Adjuntar PDF generado con `pdfkit`.
4. ✅ En POS, agregar botón “Enviar por Email” si impresora falla.
5. ✅ Dashboard: lista de “Facturas Pendientes CAE” con botón “Reintentar”.

**Entregable:** Sistema resiliente ante cualquier falla.

---

## FASE 4: REPORTES + PULIDO (Días 13-14)

### Día 13: Dashboard de Métricas

**Objetivo:** Reportes de ventas, stock y rentabilidad.

**Tareas:**

1. ✅ Rediseñar `dashboard-view.tsx` con métricas reales:
   - Ventas del día/semana/mes.
   - Productos más vendidos.
   - Stock bajo (alertas).
   - GMROI por categoría.
2. ✅ Crear endpoints en backend:
   - `GET /reports/sales-summary?from=&to=`
   - `GET /reports/low-stock?threshold=10`
   - `GET /reports/profitability`
3. ✅ Implementar gráficos con `recharts` (ya tenés `daily-sales-chart`).
4. ✅ Calcular rotación de stock: `ventas_periodo / stock_promedio`.

**Entregable:** Dashboard ejecutivo con insights de negocio.

---

### Día 14: Testing + Deploy Final

**Objetivo:** Pruebas integrales y puesta en producción.

**Tareas:**

1. ✅ Testing en terminal física:
   - Escanear 50 productos.
   - Hacer 20 ventas con promociones.
   - Probar offline → online.
   - Verificar impresión Hasar.
2. ✅ Crear instalador Electron con `electron-builder`:
   - `npm run build:electron`
3. ✅ Empaquetar `.exe` para Windows.
4. ✅ Crear documentación rápida:
   - README con instalación.
   - Manual de uso básico (PDF).
5. ✅ Instalar en PC 1 (producción).
6. ✅ Capacitar al dueño/empleados (1 hora).
7. ✅ Monitorear primera jornada real.

**Entregable:** Sistema en producción operando en el local.

---

## 🚨 RIESGOS Y MITIGACIONES

| Riesgo                              | Probabilidad | Mitigación                                   |
| ----------------------------------- | ------------ | -------------------------------------------- |
| AFIP no responde/falla certificado  | Alta         | Modo remito interno + retry automático       |
| Hasar tiene protocolo propietario   | Media        | Tener plan B con impresora térmica genérica  |
| Sincronización genera duplicados    | Media        | Usar `device_id` + `timestamp` como ID único |
| Cliente pide cambios de última hora | Alta         | Scope freeze después del día 10              |

---

## 📊 MÉTRICAS DE ÉXITO

MVP funciona si:

- ✅ Se puede vender 100% offline durante 8 horas.
- ✅ Scanner escanea en < 300ms.
- ✅ Tickets se imprimen en < 2 segundos.
- ✅ Sincronización no bloquea la UI.
- ✅ Se obtiene CAE en al menos 95% de las ventas.

---

## 🛠️ STACK FINAL CONFIRMADO

- Frontend: Next.js 14 + shadcn/ui + Zustand
- Desktop: Electron + better-sqlite3
- Backend: NestJS + Prisma + PostgreSQL
- Cloud: Railway (backend + DB)
- Hardware: Scanner Gadnic + Hasar ESC/POS
- Fiscal: AFIP SDK + Resend (email fallback)
