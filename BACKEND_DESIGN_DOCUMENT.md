# Backend Complete Refactor - Technical Design Document

**Project**: Management Software by Omnia - Supermarket Backend
**Version**: 1.0
**Date**: April 2026
**Approach**: Clean Slate (Complete Rebuild)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Patterns & Principles](#2-design-patterns--principles)
3. [Module Design](#3-module-design)
4. [Infrastructure Layer](#4-infrastructure-layer)
5. [Data Layer](#5-data-layer)
6. [Testing Architecture](#6-testing-architecture)
7. [Security Design](#7-security-design)
8. [Performance Strategy](#8-performance-strategy)
9. [Error Handling](#9-error-handling)
10. [API Design](#10-api-design)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Critical Business Rules](#12-critical-business-rules)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

**Decision**: Layered Architecture with CQRS and Event-Driven patterns

**Why**:
- **Separation of Concerns**: Clear boundaries between business logic, data access, and presentation
- **Scalability**: Event-driven allows async processing and future horizontal scaling
- **Maintainability**: Feature-based modules prevent spaghetti code
- **Testability**: Each layer can be tested in isolation

**Alternatives Considered**:
- **Monolithic MVC**: Rejected - doesn't scale well for complex business rules
- **Microservices**: Rejected - overkill for current scope, operational overhead too high
- **Clean Architecture (ports/adapters)**: Too abstract for team familiarity, would slow development

**Architecture Layers**:

```
┌─────────────────────────────────────────────────────────┐
│                   API Layer (Controllers)                │
│  - REST endpoints (/api/v1/*)                           │
│  - Request validation (DTOs)                            │
│  - Response formatting                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Application Layer (Services)                │
│  - Business orchestration                               │
│  - Transaction management                               │
│  - Command/Query handlers (CQRS)                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Domain Layer (Entities)                  │
│  - Business rules                                       │
│  - Domain events                                        │
│  - Value objects                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Infrastructure Layer (Repositories)           │
│  - Data persistence (Prisma)                            │
│  - External services                                    │
│  - Cache, Logger, Event Bus                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Module Dependency Graph

**Decision**: Strict unidirectional dependencies with shared kernel

```
                    ┌──────────────┐
                    │   Shared     │
                    │   (Events,   │
                    │   Exceptions)│
                    └──────────────┘
                           ↑
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────────┐         ┌────────┐        ┌─────────┐
   │Products│         │Inventory│        │ Pricing │
   └────────┘         └────────┘        └─────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
                     ┌──────────┐
                     │  Sales   │
                     │(Aggregate)│
                     └──────────┘
                           ↓
                     ┌──────────┐
                     │  Reports │
                     └──────────┘
```

**Why**:
- **Sales as Aggregate Root**: Coordinates Products, Inventory, and Pricing
- **No Circular Dependencies**: Products → Sales (allowed), Sales → Products (forbidden)
- **Event-Driven Decoupling**: Modules communicate via domain events
- **Shared Kernel**: Common exceptions, events, interfaces prevent duplication

**Trade-offs**:
- ✅ Prevents tight coupling
- ✅ Easy to trace data flow
- ❌ More boilerplate (event handlers)
- ❌ Eventual consistency (not real-time in all cases)

### 1.3 CQRS Pattern

**Decision**: Command/Query Separation for Sales, Inventory, and Pricing modules

**Why**:
- **Read Optimization**: Queries can use denormalized views (dashboard_metrics_view)
- **Write Safety**: Commands enforce business rules and transactions
- **Audit Trail**: Commands emit events for complete history
- **Performance**: Separate read/write models allow independent scaling

**When to Use CQRS**:
- ✅ **Sales**: Complex transactions, stock updates, audit requirements
- ✅ **Inventory**: Stock movements, batch tracking, FEFO algorithm
- ✅ **Pricing**: Price history, promotion calculations
- ❌ **Categories/Users**: Simple CRUD, overhead not justified

**Example Flow (ProcessSaleCommand)**:

```
User Request
     ↓
[POST /api/v1/sales] (Controller)
     ↓
ProcessSaleCommand (DTO validation)
     ↓
ProcessSaleHandler (Service)
     ├─ Validate stock (InventoryRepository)
     ├─ Calculate prices (PricingService)
     ├─ Apply promotions (PromotionEngine)
     ├─ Create Venta (SalesRepository)
     └─ Emit SaleProcessedEvent
            ↓
Event Handlers (async)
     ├─ UpdateStockHandler → Decrease inventory
     ├─ RecordPriceHistoryHandler → Save precio_historia
     └─ NotificationHandler → Send receipt (future)
```

---

## 2. Design Patterns & Principles

### 2.1 Repository Pattern

**Decision**: Abstract data access behind repository interfaces

**Why**:
- **Testability**: Mock repositories in unit tests
- **Flexibility**: Swap Prisma for another ORM without changing business logic
- **Encapsulation**: Domain layer doesn't know about database details

**Structure**:

```
interfaces/
  ├─ sales.repository.interface.ts
  └─ inventory.repository.interface.ts

repositories/
  ├─ sales.repository.ts (implements ISalesRepository)
  └─ inventory.repository.ts (implements IInventoryRepository)
```

**Example Interface**:

```typescript
// Conceptual - not full implementation
interface ISalesRepository {
  createSale(data: CreateSaleDto): Promise<Venta>;
  findById(id: number): Promise<Venta | null>;
  updateStock(movements: StockMovement[]): Promise<void>;
}
```

**Trade-offs**:
- ✅ Decouples domain from Prisma
- ✅ Easy to test with mocks
- ❌ Extra abstraction layer (more files)
- ❌ Prisma type safety partially lost (need manual mapping)

### 2.2 Transaction Management

**Decision**: Service-level transaction boundaries using Prisma.$transaction()

**Why**:
- **ACID Guarantees**: Sales + Stock + Price updates must be atomic
- **Rollback Safety**: If one step fails, entire operation reverts
- **Isolation**: Serializable level for SalesModule prevents race conditions

**Pattern**:

```typescript
// Conceptual pattern
async processSale(command: ProcessSaleCommand) {
  return await this.prisma.$transaction(async (tx) => {
    // Step 1: Validate stock
    const stockValid = await this.validateStock(tx, items);
    
    // Step 2: Create sale
    const venta = await this.createVenta(tx, command);
    
    // Step 3: Update stock
    await this.updateInventory(tx, movements);
    
    // Step 4: Record price history
    await this.recordPriceHistory(tx, items);
    
    return venta;
  }, {
    isolationLevel: 'Serializable', // Prevent phantom reads
    timeout: 10000 // 10s max
  });
}
```

**When to Use Transactions**:
- ✅ **Sales processing**: Venta + DetVenta + Stock + Precio
- ✅ **Inventory adjustments**: Multiple stock movements
- ✅ **Refunds**: Reverse sale + restore stock
- ❌ **Read-only queries**: Unnecessary overhead
- ❌ **Independent writes**: Categories, users (no cross-table dependencies)

**Isolation Levels**:
- **Serializable**: SalesModule (strictest, prevents all race conditions)
- **Read Committed**: InventoryModule (balance between consistency and performance)
- **Default**: Other modules (sufficient for simple CRUD)

### 2.3 Validation Pipeline

**Decision**: Three-layer validation (DTO → Business Rules → Database Constraints)

**Why**:
- **Early Exit**: Fail fast at DTO layer (invalid format)
- **Business Logic**: Complex rules in service layer (FEFO, stock availability)
- **Data Integrity**: Database constraints as last resort (unique, foreign keys)

**Validation Layers**:

```
Request → [DTO Validation] → [Business Rules] → [DB Constraints] → Response
            (class-validator)   (Service methods)   (Prisma schema)
```

**Example (CreateSaleDto)**:

```typescript
// Layer 1: DTO Validation (format, types)
class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  items: SaleItemDto[]; // Must be array, each item validated

  @IsEnum(TipoPago)
  tipo_pago: TipoPago; // Must be valid enum value
}

// Layer 2: Business Rules (service)
async validateSale(dto: CreateSaleDto) {
  // Check stock availability
  for (const item of dto.items) {
    const stock = await this.inventoryRepo.getStock(item.producto_id);
    if (stock < item.cantidad) {
      throw new InsufficientStockException();
    }
  }
  
  // Check FEFO rule (sell oldest batches first)
  await this.validateFEFO(dto.items);
}

// Layer 3: Database Constraints (schema.prisma)
// - producto_id references Producto (FK)
// - cantidad > 0 (check constraint)
// - unique index on (venta_id, producto_id)
```

**Trade-offs**:
- ✅ Clear separation of concerns
- ✅ User-friendly errors (DTO) vs technical errors (DB)
- ❌ Some duplication (e.g., NOT NULL in DTO and DB)
- ❌ Performance cost (3 validation passes)

### 2.4 Error Hierarchy

**Decision**: Custom exception classes extending NestJS HttpException

**Why**:
- **Type Safety**: Catch specific errors (InsufficientStockException vs generic Error)
- **HTTP Mapping**: Auto-convert to correct status codes (400, 404, 409)
- **Logging**: Different log levels for business errors vs system errors

**Exception Hierarchy**:

```
HttpException (NestJS base)
  │
  ├─ BusinessException (base for domain errors)
  │   ├─ InsufficientStockException (409 Conflict)
  │   ├─ InvalidPriceException (400 Bad Request)
  │   ├─ ProductNotFoundException (404 Not Found)
  │   └─ DuplicateBarcodeException (409 Conflict)
  │
  ├─ TechnicalException (base for system errors)
  │   ├─ DatabaseConnectionException (503 Service Unavailable)
  │   ├─ CacheException (500 Internal Server Error)
  │   └─ EventBusException (500 Internal Server Error)
  │
  └─ ValidationException (400 Bad Request)
```

**Global Exception Filter**:

```typescript
// Conceptual pattern
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    if (exception instanceof BusinessException) {
      // Log as warning, expected errors
      this.logger.warn(exception.message);
      return response.status(exception.getStatus()).json({
        error: exception.message,
        code: exception.code
      });
    }
    
    if (exception instanceof TechnicalException) {
      // Log as error, needs investigation
      this.logger.error(exception.stack);
      return response.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }
    
    // Unknown errors
    this.logger.fatal(exception);
    return response.status(500).json({ error: 'Internal error' });
  }
}
```

---

## 3. Module Design

### 3.1 SalesModule (Core Aggregate)

**Responsibility**: Process sales, refunds, split payments, price overrides

**Why This Design**:
- **Aggregate Root**: Coordinates Inventory, Pricing, Products
- **CQRS**: Commands for writes (ProcessSale), queries for reads (GetSales)
- **Event Sourcing Lite**: Emit events for audit trail without full event store

**Commands**:
- `ProcessSaleCommand`: Create new sale with stock deduction
- `ProcessRefundCommand`: Partial or full refund with stock restoration
- `CancelSaleCommand`: Mark sale as cancelled (no stock change if already shipped)

**Queries**:
- `GetSaleByIdQuery`: Retrieve sale with details
- `GetSalesByDateQuery`: Filter by date range (reports)
- `GetSalesByUserQuery`: Filter by cajero_id

**Event Flow**:

```
ProcessSaleCommand
     ↓
ProcessSaleHandler
     ├─ Validate stock (sync)
     ├─ Calculate prices (sync)
     ├─ Create Venta in DB (sync)
     └─ Emit SaleProcessedEvent (async)
            ↓
Event Handlers
     ├─ UpdateStockHandler → Decrement inventory
     ├─ RecordPriceHistoryHandler → Save precio_historia
     └─ UpdateDashboardMetricsHandler → Refresh materialized view
```

**Key Design Decisions**:

1. **Split Payments**:
   - **Decision**: One Venta, multiple MedioPago records
   - **Why**: Single transaction ID, simpler refund logic
   - **Alternative**: Separate Venta per payment type (rejected - breaks transaction atomicity)

2. **Precio Manual**:
   - **Decision**: Mandatory for categories F/V/P/C, optional elsewhere
   - **Why**: Perishables have variable pricing (by weight/unit)
   - **Validation**: Service layer checks codigo_categoria before allowing override

3. **FEFO Algorithm**:
   - **Decision**: Sell batches with earliest fecha_vencimiento first
   - **Why**: Minimize spoilage, legal compliance
   - **Implementation**: ORDER BY fecha_vencimiento ASC in stock query
   - **No Warnings**: Sell until last day (spec requirement)

4. **Refund Constraints**:
   - **Decision**: Track SUM(devolucion.cantidad) ≤ original cantidad per item
   - **Why**: Prevent over-refunding
   - **Implementation**: Database check constraint + service validation

**Testing Strategy**:
- **Unit Tests**: Command handlers with mocked repositories (60% coverage target)
- **Integration Tests**: Full flow with test database (30% coverage target)
- **E2E Tests**: API calls with Supertest (10% coverage target)
- **Target**: 90% coverage for SalesModule (critical path)

### 3.2 InventoryModule

**Responsibility**: Stock tracking, batch management, FEFO enforcement

**Design Patterns**:
- **Repository**: Abstract Prisma queries
- **Strategy Pattern**: Different stock deduction strategies (FEFO, LIFO, Manual)
- **Observer**: Emit InventoryUpdatedEvent after stock changes

**Key Entities**:
- `Stock`: Current quantity per product
- `MovimientoStock`: Audit trail (entrada, salida, ajuste, devolucion)
- `Lote`: Batch tracking (fecha_vencimiento, proveedor)

**FEFO Implementation**:

```typescript
// Conceptual algorithm
async deductStock(producto_id: number, cantidad: number) {
  // Step 1: Get batches ordered by expiry date
  const lotes = await this.prisma.lote.findMany({
    where: { producto_id, cantidad_disponible: { gt: 0 } },
    orderBy: { fecha_vencimiento: 'asc' } // FEFO
  });
  
  let remaining = cantidad;
  const movements = [];
  
  // Step 2: Deduct from oldest batches first
  for (const lote of lotes) {
    if (remaining <= 0) break;
    
    const deduct = Math.min(lote.cantidad_disponible, remaining);
    movements.push({
      lote_id: lote.id,
      cantidad: deduct,
      tipo: 'salida'
    });
    
    remaining -= deduct;
  }
  
  // Step 3: Check if sufficient stock
  if (remaining > 0) {
    throw new InsufficientStockException();
  }
  
  // Step 4: Execute movements in transaction
  return movements;
}
```

**Alternative Strategies**:
- **LIFO**: Last In First Out (rejected - increases spoilage)
- **Manual Selection**: User picks batch (rejected - too slow for POS)
- **Average Cost**: No batch tracking (rejected - loses traceability)

**Trade-offs**:
- ✅ Minimizes waste
- ✅ Regulatory compliance
- ❌ More complex queries
- ❌ Can't sell specific batch (always oldest)

### 3.3 PricingModule

**Responsibility**: Base prices, promotions, price overrides, history tracking

**Design Patterns**:
- **Strategy Pattern**: Different promotion types (percentage, fixed, buy-X-get-Y)
- **Chain of Responsibility**: Promotion eligibility checks
- **Template Method**: Price calculation flow

**Promotion Auto-Apply Algorithm**:

```
For each sale item:
  1. Get active promotions for producto_id (fecha_inicio ≤ NOW ≤ fecha_fin)
  2. Sort by prioridad DESC (highest priority first)
  3. Filter by conditions (cantidad_minima, categoria, etc.)
  4. Apply first eligible promotion
  5. If acumulable = true, continue to next promotion
  6. If acumulable = false, stop
  7. Return final price
```

**Key Design Decisions**:

1. **Prioridad Field**:
   - **Decision**: Integer field (higher = more important)
   - **Why**: Resolve conflicts when multiple promotions apply
   - **Example**: Black Friday (prioridad=100) overrides regular discount (prioridad=10)

2. **Acumulabilidad**:
   - **Decision**: Boolean flag per promotion
   - **Why**: Some promotions stack (membership + seasonal), others don't (clearance)
   - **Logic**: First non-acumulable promotion stops chain

3. **Price History**:
   - **Decision**: Database trigger auto-saves to precios_historia on precio_unitario update
   - **Why**: Complete audit trail, no code needed in service layer
   - **Alternative**: Service-layer history (rejected - easy to forget, trigger guarantees)

**Testing Challenges**:
- **Combinatorial Explosion**: Many promotion combinations
- **Solution**: Parameterized tests with test cases table
- **Example**: Test 3 priorities × 2 acumulabilidad states × 4 types = 24 cases

### 3.4 ProductsModule

**Responsibility**: Product catalog, categories, barcodes

**Design Simplicity**:
- **No CQRS**: Simple CRUD operations
- **No Events**: Changes don't trigger workflows (except soft deletes)
- **Repository Pattern**: Abstract Prisma for testability

**Key Validations**:
- **Unique Barcode**: Database unique constraint + service validation
- **Codigo Categoria**: Must exist in Categoria table (FK)
- **Soft Deletes**: `deleted_at` timestamp, never hard delete
- **Precio Manual Flag**: Auto-set based on codigo_categoria (F/V/P/C)

**Why Simple**:
- Products change infrequently
- No complex business rules
- Over-engineering would add no value

### 3.5 ReportsModule

**Responsibility**: Dashboards, analytics, historical queries

**Design Patterns**:
- **Read-Only**: No commands, only queries
- **Materialized Views**: Pre-computed metrics (dashboard_metrics_view)
- **Query Objects**: Encapsulate complex SQL

**Dashboard Metrics View**:

```sql
-- Conceptual view (actual DDL in migration)
CREATE MATERIALIZED VIEW dashboard_metrics_view AS
SELECT
  DATE(v.fecha_hora) as fecha,
  COUNT(v.id) as total_ventas,
  SUM(v.total) as monto_total,
  SUM(dv.cantidad) as productos_vendidos,
  COUNT(DISTINCT v.cajero_id) as cajeros_activos
FROM ventas v
JOIN detalle_venta dv ON v.id = dv.venta_id
GROUP BY DATE(v.fecha_hora);
```

**Why Materialized View**:
- **Performance**: Dashboard loads in <500ms (vs 5s with live queries)
- **Reduced Load**: No JOIN on every request
- **Trade-off**: Data delayed by refresh interval (5 minutes acceptable)

**Refresh Strategy**:
- **Scheduled**: CRON job every 5 minutes
- **Event-Driven**: Refresh on SaleProcessedEvent (optional, more real-time)
- **Manual**: Admin endpoint /api/v1/reports/refresh-dashboard

**Alternative Considered**:
- **Real-Time Aggregation**: Rejected - too slow for large datasets
- **OLAP Cube**: Rejected - overkill for current scale
- **External BI Tool**: Future consideration (Metabase, Redash)

---

## 4. Infrastructure Layer

### 4.1 Prisma Configuration

**Decision**: Prisma as ORM with middleware for auditing and soft deletes

**Why Prisma**:
- ✅ Type-safe queries (compile-time errors)
- ✅ Migration system (version control for schema)
- ✅ Excellent NestJS integration
- ✅ Connection pooling built-in
- ❌ Less flexible than raw SQL (trade-off accepted)

**Middleware Chain**:

```typescript
// Conceptual middleware
prisma.$use(async (params, next) => {
  // Middleware 1: Soft Delete Interceptor
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deleted_at: new Date() };
  }
  
  // Middleware 2: Query Filter (exclude deleted)
  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = {
      ...params.args.where,
      deleted_at: null
    };
  }
  
  return next(params);
});

// Middleware 3: Audit Logger
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  logger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`);
  return result;
});
```

**Connection Pooling**:
- **Max Connections**: 10 (Railway Neon limit)
- **Timeout**: 30s
- **Retry**: 3 attempts with exponential backoff

### 4.2 Cache Strategy

**Decision**: Redis for frequently accessed data (products, promotions, dashboard)

**Why Redis**:
- ✅ Sub-millisecond reads
- ✅ TTL support (auto-expire stale data)
- ✅ NestJS cache-manager integration
- ❌ Extra infrastructure (accepted - performance gain worth it)

**Caching Rules**:

| Data Type | TTL | Invalidation Strategy |
|-----------|-----|----------------------|
| Products | 1 hour | On update event |
| Promotions | 5 minutes | On create/update event |
| Dashboard Metrics | 5 minutes | On materialized view refresh |
| User Sessions | 24 hours | On logout |
| Categories | 24 hours | Manual (rare changes) |

**Cache-Aside Pattern**:

```typescript
// Conceptual pattern
async getProduct(id: number) {
  // Step 1: Check cache
  const cached = await this.cache.get(`product:${id}`);
  if (cached) return cached;
  
  // Step 2: Query database
  const product = await this.prisma.producto.findUnique({ where: { id } });
  
  // Step 3: Store in cache
  await this.cache.set(`product:${id}`, product, { ttl: 3600 });
  
  return product;
}
```

**Invalidation Example**:

```typescript
// On ProductUpdatedEvent
@OnEvent('product.updated')
async handleProductUpdate(event: ProductUpdatedEvent) {
  await this.cache.del(`product:${event.producto_id}`);
}
```

**Trade-offs**:
- ✅ 10x faster reads
- ✅ Reduced DB load
- ❌ Cache invalidation complexity
- ❌ Stale data risk (mitigated by short TTLs)

### 4.3 Logger

**Decision**: Winston with structured logging (JSON format)

**Why Winston**:
- ✅ Multiple transports (console, file, remote)
- ✅ Log levels (error, warn, info, debug)
- ✅ NestJS integration
- ✅ Production-ready (rotation, compression)

**Log Levels**:
- **Fatal**: Application crash (database down, OOM)
- **Error**: Request failed (uncaught exception)
- **Warn**: Expected error (business rule violation)
- **Info**: Normal operations (server start, endpoint hit)
- **Debug**: Development details (query params, cache hits)

**Structured Format**:

```json
{
  "timestamp": "2026-04-20T10:30:00.000Z",
  "level": "error",
  "message": "Insufficient stock for product",
  "context": "SalesService",
  "trace": "ProcessSaleHandler.execute",
  "metadata": {
    "producto_id": 123,
    "requested": 10,
    "available": 5
  }
}
```

**Why JSON**:
- ✅ Machine-parsable (log aggregation tools)
- ✅ Structured queries (filter by producto_id)
- ❌ Less human-readable (mitigated by dev-only pretty-print)

### 4.4 Event Bus

**Decision**: NestJS EventEmitter2 (in-process events)

**Why Not External Message Queue**:
- Current scale doesn't justify Kafka/RabbitMQ
- All modules in same process (no microservices)
- EventEmitter2 sufficient for async handlers
- **Future Migration Path**: Easy to swap for external bus later

**Event Flow**:

```
Service → eventEmitter.emit('sale.processed', event)
               ↓
EventEmitter2 (in-memory)
               ↓
        ┌──────┴──────┐
        ↓             ↓
UpdateStockHandler  RecordPriceHandler
```

**Event Naming Convention**:
- **Format**: `{module}.{action}` (lowercase, dot-separated)
- **Examples**: `sale.processed`, `product.updated`, `inventory.depleted`

**Error Handling in Handlers**:
- **Decision**: Handlers catch own errors, emit failure events
- **Why**: One handler failure shouldn't block others
- **Pattern**:

```typescript
@OnEvent('sale.processed')
async handleSaleProcessed(event: SaleProcessedEvent) {
  try {
    await this.updateStock(event);
  } catch (error) {
    this.logger.error('Stock update failed', error);
    this.eventEmitter.emit('stock.update.failed', {
      sale_id: event.sale_id,
      error: error.message
    });
  }
}
```

---

## 5. Data Layer

### 5.1 Database Schema Principles

**Normalization**:
- **3NF (Third Normal Form)**: No transitive dependencies
- **Exceptions**: Denormalized dashboard_metrics_view (read performance)

**Constraints**:
- **Primary Keys**: Auto-increment integers (id)
- **Foreign Keys**: Enforce referential integrity
- **Unique Constraints**: Prevent duplicates (barcode, email)
- **Check Constraints**: Business rules (cantidad > 0, precio >= 0)

**Audit Columns** (all tables):
- `created_at`: Auto-set on insert
- `updated_at`: Auto-update on every change
- `deleted_at`: Soft delete timestamp (nullable)

### 5.2 Critical Indexes

**Why Indexes**:
- **Performance**: 100x faster lookups on large tables
- **Trade-off**: Slower writes (acceptable, reads >> writes)

**Index Strategy**:

```sql
-- Products: Lookup by barcode (POS scanning)
CREATE INDEX idx_productos_codigo_barra ON productos(codigo_barra);

-- Sales: Date range queries (reports)
CREATE INDEX idx_ventas_fecha_hora ON ventas(fecha_hora);

-- Inventory: Product + Expiry (FEFO algorithm)
CREATE INDEX idx_lote_producto_vencimiento 
  ON lote(producto_id, fecha_vencimiento);

-- Pricing: Active promotions lookup
CREATE INDEX idx_promociones_activas 
  ON promociones(fecha_inicio, fecha_fin) 
  WHERE deleted_at IS NULL;

-- Composite: Sales by user and date (common report query)
CREATE INDEX idx_ventas_cajero_fecha 
  ON ventas(cajero_id, fecha_hora);
```

**Covering Indexes** (future optimization):
- Include columns in index to avoid table lookup
- Example: `CREATE INDEX idx_products_full ON productos(id) INCLUDE (nombre, precio_unitario)`

### 5.3 Database Triggers

**Decision**: Use triggers for automatic audit columns

**Why**:
- **Guaranteed Execution**: Can't forget to update timestamp
- **Atomic**: Same transaction as main query
- **Centralized**: One trigger vs 50 service methods

**Triggers**:

1. **Auto-Update updated_at**:
```sql
CREATE TRIGGER update_productos_timestamp
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

2. **Price History Auto-Save**:
```sql
CREATE TRIGGER save_price_history
AFTER UPDATE OF precio_unitario ON productos
FOR EACH ROW
WHEN (OLD.precio_unitario IS DISTINCT FROM NEW.precio_unitario)
EXECUTE FUNCTION insert_precio_historia();
```

3. **Stock Movement Audit**:
```sql
CREATE TRIGGER audit_stock_change
AFTER UPDATE OF stock_actual ON stock
FOR EACH ROW
EXECUTE FUNCTION log_movimiento_stock();
```

**Alternative Considered**:
- **Service-Layer Audit**: Rejected - easy to forget, inconsistent
- **Database Middleware**: Rejected - Prisma doesn't support custom middleware well

**Trade-offs**:
- ✅ Bulletproof consistency
- ✅ No code needed in services
- ❌ Less visibility (hidden logic)
- ❌ Harder to test (need database for trigger tests)

---

## 6. Testing Architecture

### 6.1 Test Pyramid

**Decision**: 60% Unit / 30% Integration / 10% E2E

**Why**:
- **Unit Tests**: Fast feedback, isolate bugs
- **Integration Tests**: Verify module interactions
- **E2E Tests**: Critical paths only (slow, brittle)

**Visual**:

```
        ┌─────┐
       │  E2E  │ (10%) - Full API calls, real DB
       │ Tests │ Target: 5 critical flows
      └───────┘
     ┌──────────┐
    │Integration│ (30%) - Module boundaries
    │   Tests    │ Target: All service public methods
   └────────────┘
  ┌──────────────┐
 │  Unit Tests   │ (60%) - Business logic isolation
 │               │ Target: All handlers, validators
└────────────────┘
```

### 6.2 Unit Testing Strategy

**Tools**: Jest + ts-mockito

**What to Test**:
- ✅ Command/Query handlers
- ✅ Business rule validators
- ✅ Price calculation logic
- ✅ FEFO algorithm
- ❌ DTOs (class-validator handles)
- ❌ Database queries (integration tests)

**Mocking Pattern**:

```typescript
// Conceptual unit test
describe('ProcessSaleHandler', () => {
  let handler: ProcessSaleHandler;
  let mockSalesRepo: jest.Mocked<ISalesRepository>;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  
  beforeEach(() => {
    mockSalesRepo = createMock<ISalesRepository>();
    mockInventoryRepo = createMock<IInventoryRepository>();
    handler = new ProcessSaleHandler(mockSalesRepo, mockInventoryRepo);
  });
  
  it('should throw InsufficientStockException when stock < cantidad', async () => {
    // Arrange
    mockInventoryRepo.getStock.mockResolvedValue(5);
    const command = new ProcessSaleCommand({ items: [{ cantidad: 10 }] });
    
    // Act & Assert
    await expect(handler.execute(command))
      .rejects
      .toThrow(InsufficientStockException);
  });
});
```

**Coverage Target**: 90% for SalesModule, 80% for others

### 6.3 Integration Testing Strategy

**Tools**: Jest + Test Containers (PostgreSQL)

**What to Test**:
- ✅ Repository methods with real database
- ✅ Transaction rollbacks
- ✅ Trigger execution
- ✅ Index performance (explain plans)

**Test Database Setup**:

```typescript
// Conceptual setup
beforeAll(async () => {
  // Start PostgreSQL container
  postgresContainer = await new PostgreSQLContainer().start();
  
  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { DATABASE_URL: postgresContainer.getConnectionString() }
  });
  
  // Seed test data
  await prisma.producto.createMany({ data: testProducts });
});

afterAll(async () => {
  await postgresContainer.stop();
});
```

**Why Test Containers**:
- ✅ Isolated environment (no shared test DB)
- ✅ Parallel test execution
- ✅ Real database engine (not SQLite mock)
- ❌ Slower than in-memory (mitigated by parallel runs)

### 6.4 E2E Testing Strategy

**Tools**: Supertest + NestJS TestingModule

**Critical Flows to Test**:
1. **Happy Path Sale**: POST /api/v1/sales → 201 Created
2. **Insufficient Stock**: POST /api/v1/sales → 409 Conflict
3. **Refund Flow**: POST /api/v1/sales/:id/refund → 200 OK
4. **Price Override**: POST /api/v1/sales (with precio_manual) → 201 Created
5. **Dashboard Load**: GET /api/v1/reports/dashboard → 200 OK (<500ms)

**Example E2E Test**:

```typescript
// Conceptual E2E test
describe('POST /api/v1/sales', () => {
  it('should process sale and deduct stock', async () => {
    // Arrange: Seed product with stock
    await prisma.producto.create({
      data: { codigo_barra: '123', stock_actual: 10 }
    });
    
    // Act: Make sale
    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .send({
        items: [{ codigo_barra: '123', cantidad: 3 }],
        tipo_pago: 'EFECTIVO'
      })
      .expect(201);
    
    // Assert: Check response and database state
    expect(response.body.total).toBeGreaterThan(0);
    
    const updatedStock = await prisma.stock.findFirst({
      where: { producto: { codigo_barra: '123' } }
    });
    expect(updatedStock.stock_actual).toBe(7); // 10 - 3
  });
});
```

**Performance Tests**:
- **Dashboard**: Must load in <500ms with 10,000 sales
- **POS Sale**: Must complete in <1s with 20 items
- **Report Generation**: Must complete in <3s for 1 month of data

---

## 7. Security Design

### 7.1 Authentication

**Decision**: JWT (JSON Web Tokens) with refresh tokens

**Why JWT**:
- ✅ Stateless (no session storage)
- ✅ Scalable (no server-side session lookup)
- ✅ Standard (widely supported)
- ❌ Can't revoke before expiry (mitigated by short TTL + refresh tokens)

**Token Strategy**:
- **Access Token**: 15 minutes TTL, contains user_id + roles
- **Refresh Token**: 7 days TTL, stored in database (can revoke)
- **Storage**: HttpOnly cookie (prevents XSS)

**Authentication Flow**:

```
1. POST /api/v1/auth/login (email + password)
     ↓
2. Validate credentials (bcrypt.compare)
     ↓
3. Generate JWT tokens (access + refresh)
     ↓
4. Return tokens in HttpOnly cookies
     ↓
5. Client includes cookie in subsequent requests
     ↓
6. Guard validates JWT signature + expiry
     ↓
7. If expired, POST /api/v1/auth/refresh with refresh token
```

**Password Hashing**:
- **Algorithm**: bcrypt with cost factor 12
- **Why bcrypt**: Designed for passwords (slow, prevents brute force)
- **Alternative Considered**: Argon2 (rejected - bcrypt sufficient, wider library support)

### 7.2 Authorization

**Decision**: Role-Based Access Control (RBAC) with NestJS Guards

**Roles**:
- `ADMIN`: Full access (manage users, products, reports)
- `CAJERO`: POS operations (create sales, refunds)
- `SUPERVISOR`: Read-only access to reports
- `REPONEDOR`: Inventory management (stock updates)

**Guard Pattern**:

```typescript
// Conceptual guard
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard
    
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

**Usage**:

```typescript
@Post('/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CAJERO', 'ADMIN')
async createSale(@Body() dto: CreateSaleDto) {
  // Only CAJERO or ADMIN can execute
}
```

**Why RBAC**:
- ✅ Simple to implement
- ✅ Sufficient for current requirements
- ❌ Less granular than ABAC (Attribute-Based Access Control)
- **Future**: Migrate to ABAC if need fine-grained permissions (e.g., "can edit own sales only")

### 7.3 API Security

**Rate Limiting**:
- **Decision**: 100 requests/minute per IP
- **Why**: Prevent brute force, DDoS
- **Tool**: @nestjs/throttler

**CORS**:
- **Decision**: Whitelist frontend domain only
- **Config**: `origin: ['https://app.omnia.com']`

**Helmet.js**:
- **Decision**: Enable all headers (CSP, HSTS, X-Frame-Options)
- **Why**: Defense in depth (XSS, clickjacking)

**Input Sanitization**:
- **Decision**: class-validator + class-sanitizer
- **Transforms**: Trim strings, lowercase emails, escape HTML

---

## 8. Performance Strategy

### 8.1 Database Optimization

**Query Optimization**:
- **Decision**: Use Prisma query analyzer + EXPLAIN ANALYZE
- **Process**:
  1. Identify slow queries (>100ms) in logs
  2. Run EXPLAIN ANALYZE to check plan
  3. Add indexes if sequential scans found
  4. Rewrite query if needed (avoid N+1)

**N+1 Prevention**:

```typescript
// ❌ Bad: N+1 query problem
const ventas = await prisma.venta.findMany();
for (const venta of ventas) {
  venta.items = await prisma.detalleVenta.findMany({ where: { venta_id: venta.id } });
}
// Result: 1 + N queries (slow)

// ✅ Good: Single query with include
const ventas = await prisma.venta.findMany({
  include: { detalles: true }
});
// Result: 1 query (fast)
```

**Pagination**:
- **Decision**: Cursor-based for large datasets (>10,000 records)
- **Why**: Offset pagination slow on large tables (DB must skip N rows)

**Connection Pooling**:
- **Max Connections**: 10 (Railway limit)
- **Strategy**: Queue requests when pool full (vs reject)

### 8.2 Caching Strategy

(See Section 4.2 for details)

**Cache Warming**:
- **Decision**: Pre-load products and promotions on server start
- **Why**: First request shouldn't wait for DB

**Cache Hit Rate Target**: >80% for products, >60% for dashboard

### 8.3 Response Optimization

**Compression**:
- **Decision**: gzip compression for responses >1KB
- **Tool**: NestJS compression middleware

**Pagination**:
- **Default Page Size**: 20 items
- **Max Page Size**: 100 items (prevent abuse)

**Field Selection**:
- **Decision**: Support ?fields=id,nombre query param
- **Why**: Mobile clients may not need all fields

---

## 9. Error Handling

(See Section 2.4 for exception hierarchy)

### 9.1 Error Response Format

**Standard Error Response**:

```json
{
  "statusCode": 409,
  "message": "Insufficient stock for product 'Coca Cola 2L'",
  "error": "Conflict",
  "code": "INSUFFICIENT_STOCK",
  "timestamp": "2026-04-20T10:30:00.000Z",
  "path": "/api/v1/sales",
  "details": {
    "producto_id": 123,
    "requested": 10,
    "available": 5
  }
}
```

**Why This Format**:
- ✅ Machine-parsable (code field)
- ✅ Human-readable (message field)
- ✅ Debuggable (timestamp, path, details)

### 9.2 Logging Strategy

(See Section 4.3 for logger design)

**Log Sampling**:
- **Decision**: Sample 10% of info logs in production
- **Why**: Reduce log volume, keep costs low
- **Always Log**: Errors, warnings, fatal (100%)

---

## 10. API Design

### 10.1 REST Conventions

**Base URL**: `/api/v1`

**HTTP Methods**:
- `GET`: Retrieve resources (idempotent)
- `POST`: Create resources (non-idempotent)
- `PATCH`: Partial update (idempotent)
- `DELETE`: Soft delete (sets deleted_at)

**Status Codes**:
- `200 OK`: Successful GET/PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Business rule violation (e.g., insufficient stock)
- `500 Internal Server Error`: Unexpected error

### 10.2 Versioning Strategy

**Decision**: URL versioning (/api/v1, /api/v2)

**Why**:
- ✅ Clear for clients (version in URL)
- ✅ Easy to deploy multiple versions
- ❌ URL pollution (mitigated by deprecation policy)

**Deprecation Policy**:
- Support N-1 version for 6 months
- Return deprecation header: `Sunset: Sat, 01 Nov 2026 00:00:00 GMT`

### 10.3 Endpoint Design

**Sales Endpoints**:
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales/:id` - Get sale by ID
- `GET /api/v1/sales?fecha_desde=X&fecha_hasta=Y` - Filter sales
- `POST /api/v1/sales/:id/refund` - Process refund
- `PATCH /api/v1/sales/:id/cancel` - Cancel sale

**Inventory Endpoints**:
- `GET /api/v1/inventory/stock?producto_id=X` - Check stock
- `POST /api/v1/inventory/adjust` - Manual stock adjustment
- `GET /api/v1/inventory/lotes?vencimiento_antes=Y` - Expiring batches

**Pricing Endpoints**:
- `GET /api/v1/pricing/calculate?items=[...]` - Calculate price (with promotions)
- `POST /api/v1/pricing/promotions` - Create promotion
- `GET /api/v1/pricing/history?producto_id=X` - Price history

**Reports Endpoints**:
- `GET /api/v1/reports/dashboard` - Dashboard metrics
- `GET /api/v1/reports/sales?periodo=mes` - Sales report
- `GET /api/v1/reports/inventory/low-stock` - Products below minimum

---

## 11. Deployment Architecture

### 11.1 Railway Deployment

**Components**:
- **Backend Service**: NestJS app (Node.js 20)
- **Database**: Neon PostgreSQL (serverless)
- **Cache**: Railway Redis (optional, future)

**Environment Variables**:

```env
DATABASE_URL=postgresql://user:pass@neon.tech:5432/db
JWT_SECRET=<generated-secret>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
REDIS_URL=redis://railway.app:6379 (future)
NODE_ENV=production
PORT=3000
```

**Build Process**:

```yaml
# Conceptual railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm prisma generate && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm prisma migrate deploy && pnpm start:prod",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Why Railway**:
- ✅ Auto-deploy from Git
- ✅ Built-in PostgreSQL (Neon)
- ✅ Zero-downtime deploys
- ❌ More expensive than VPS (trade-off accepted for convenience)

### 11.2 Database Migrations

**Decision**: Prisma Migrate with version control

**Migration Strategy**:
- **Development**: `prisma migrate dev` (creates migration + applies)
- **Production**: `prisma migrate deploy` (applies pending migrations)
- **Rollback**: Manual (create reverse migration, not automatic)

**Migration Naming**:
- **Format**: `YYYYMMDDHHMMSS_description`
- **Example**: `20260420103000_add_price_history_trigger`

**Why No Auto-Rollback**:
- Data migrations can't always reverse (deleted data)
- Manual review prevents accidental data loss

### 11.3 Monitoring

**Health Check Endpoint**:

```typescript
@Get('/health')
healthCheck() {
  return {
    status: 'ok',
    database: await this.prisma.$queryRaw`SELECT 1`, // DB connection check
    cache: await this.cache.ping(), // Redis check (future)
    uptime: process.uptime()
  };
}
```

**Logging**:
- **Production**: Winston → Railway logs
- **Future**: Ship to external service (Datadog, LogRocket)

**Alerting** (future):
- **Error Rate**: Alert if >5% requests fail
- **Response Time**: Alert if p95 >1s
- **Database**: Alert if connection pool full

---

## 12. Critical Business Rules

### 12.1 FEFO Algorithm

**Rule**: Always sell batches with earliest expiry date first

**Implementation**: See Section 3.2

**Edge Cases**:
- **No expiry date**: Treat as infinite (sort last)
- **Same expiry date**: Use FIFO (older entry first)
- **Expired batch**: Include until last day (no warnings, per spec)

### 12.2 Split Payments

**Rule**: One sale can have multiple payment methods, same transaction ID

**Schema**:
```
Venta (id=1, total=100, transaccion_id='TXN123')
  └─ MedioPago (venta_id=1, tipo='EFECTIVO', monto=60)
  └─ MedioPago (venta_id=1, tipo='TARJETA', monto=40)
```

**Validation**: SUM(medios_pago.monto) MUST equal venta.total

### 12.3 Precio Manual

**Rule**: Required for categories F/V/P/C (Fresh/Vegetables/Produce/Cheese)

**Validation**:

```typescript
// Conceptual validation
if (['F', 'V', 'P', 'C'].includes(producto.codigo_categoria)) {
  if (!dto.precio_manual) {
    throw new PriceOverrideRequiredException();
  }
}
```

**Why**: Variable pricing (by weight, quality)

### 12.4 Refund Constraints

**Rule**: SUM(all refunds for same item) ≤ original cantidad

**Validation**:

```typescript
// Conceptual validation
const totalRefunded = await this.prisma.devolucion.aggregate({
  where: { venta_id, producto_id },
  _sum: { cantidad: true }
});

if (totalRefunded._sum.cantidad + dto.cantidad > originalCantidad) {
  throw new RefundExceedsOriginalException();
}
```

**Database Constraint**:
```sql
ALTER TABLE devoluciones
ADD CONSTRAINT check_refund_limit
CHECK (
  (SELECT SUM(cantidad) FROM devoluciones WHERE venta_id = NEW.venta_id AND producto_id = NEW.producto_id)
  <=
  (SELECT cantidad FROM detalle_venta WHERE venta_id = NEW.venta_id AND producto_id = NEW.producto_id)
);
```

### 12.5 Transaction Isolation

**Rule**: Serializable isolation for SalesModule (prevent stock race conditions)

**Why**:
- **Scenario**: Two cashiers sell last item simultaneously
- **Without Serializable**: Both sales succeed, stock goes negative
- **With Serializable**: Second transaction blocked until first commits, then fails with insufficient stock

**Trade-off**:
- ✅ Data consistency guaranteed
- ❌ Lower throughput (transactions queue)
- **Accepted**: Correctness > performance for financial transactions

---

## Appendix A: Technology Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Runtime | Node.js | 20 LTS | Latest stable, long-term support |
| Framework | NestJS | 10.x | Enterprise-grade, modular architecture |
| ORM | Prisma | 5.x | Type-safe, excellent DX |
| Database | PostgreSQL | 15 | ACID, triggers, materialized views |
| Cache | Redis | 7.x (future) | Fast, TTL support |
| Auth | JWT + bcrypt | - | Stateless, secure password hashing |
| Testing | Jest | 29.x | NestJS standard, rich ecosystem |
| Logger | Winston | 3.x | Production-ready, flexible |
| Validation | class-validator | 0.14.x | Decorator-based, integrates with NestJS |
| Deployment | Railway | - | Auto-deploy, managed PostgreSQL |

---

## Appendix B: File Structure

```
apps/backend/
├─ src/
│  ├─ auth/                   # Authentication & authorization
│  │  ├─ guards/
│  │  │  ├─ jwt-auth.guard.ts
│  │  │  └─ roles.guard.ts
│  │  ├─ strategies/
│  │  │  └─ jwt.strategy.ts
│  │  ├─ auth.service.ts
│  │  ├─ auth.controller.ts
│  │  └─ auth.module.ts
│  │
│  ├─ sales/                  # Sales aggregate (CQRS)
│  │  ├─ commands/
│  │  │  ├─ process-sale.command.ts
│  │  │  └─ process-refund.command.ts
│  │  ├─ queries/
│  │  │  └─ get-sale-by-id.query.ts
│  │  ├─ handlers/
│  │  │  ├─ process-sale.handler.ts
│  │  │  └─ update-stock.handler.ts (event)
│  │  ├─ dto/
│  │  │  ├─ create-sale.dto.ts
│  │  │  └─ refund-sale.dto.ts
│  │  ├─ entities/
│  │  │  └─ venta.entity.ts
│  │  ├─ repositories/
│  │  │  └─ sales.repository.ts
│  │  ├─ sales.service.ts
│  │  ├─ sales.controller.ts
│  │  └─ sales.module.ts
│  │
│  ├─ inventory/              # Stock management
│  │  ├─ dto/
│  │  ├─ entities/
│  │  ├─ repositories/
│  │  ├─ inventory.service.ts
│  │  ├─ inventory.controller.ts
│  │  └─ inventory.module.ts
│  │
│  ├─ pricing/                # Prices & promotions
│  │  ├─ strategies/
│  │  │  ├─ percentage-discount.strategy.ts
│  │  │  └─ fixed-price.strategy.ts
│  │  ├─ pricing.service.ts
│  │  ├─ promotion-engine.service.ts
│  │  └─ pricing.module.ts
│  │
│  ├─ products/               # Product catalog (simple CRUD)
│  │  ├─ dto/
│  │  ├─ entities/
│  │  ├─ products.service.ts
│  │  ├─ products.controller.ts
│  │  └─ products.module.ts
│  │
│  ├─ reports/                # Analytics & dashboards
│  │  ├─ queries/
│  │  ├─ reports.service.ts
│  │  ├─ reports.controller.ts
│  │  └─ reports.module.ts
│  │
│  ├─ shared/                 # Common utilities
│  │  ├─ events/
│  │  │  ├─ sale-processed.event.ts
│  │  │  └─ product-updated.event.ts
│  │  ├─ exceptions/
│  │  │  ├─ business.exception.ts
│  │  │  └─ insufficient-stock.exception.ts
│  │  ├─ interfaces/
│  │  │  └─ repository.interface.ts
│  │  └─ logger/
│  │     └─ winston.config.ts
│  │
│  ├─ database/               # Prisma module
│  │  ├─ prisma.service.ts
│  │  └─ prisma.module.ts
│  │
│  ├─ cache/                  # Redis module (future)
│  │  └─ cache.module.ts
│  │
│  ├─ health/
│  │  └─ health.controller.ts
│  │
│  ├─ app.module.ts           # Root module
│  └─ main.ts                 # Bootstrap
│
├─ prisma/
│  ├─ migrations/
│  ├─ schema.prisma
│  └─ seed.ts
│
├─ test/
│  ├─ sales.e2e-spec.ts
│  └─ inventory.e2e-spec.ts
│
├─ .env.example
├─ jest.config.js
├─ tsconfig.json
└─ package.json
```

---

## Appendix C: Next Steps (Post-Design)

1. **Review & Approval**: Stakeholder review of this design document
2. **Task Breakdown**: Split into implementation tickets (Jira/Linear)
3. **Environment Setup**: Railway project, Neon database, environment variables
4. **Phase 1**: Database schema + migrations (Prisma)
5. **Phase 2**: Core modules (Products, Inventory, Pricing)
6. **Phase 3**: Sales aggregate (CQRS implementation)
7. **Phase 4**: Reports module (dashboard view)
8. **Phase 5**: Testing (achieve 90% coverage for Sales)
9. **Phase 6**: Deployment pipeline (Railway auto-deploy)
10. **Phase 7**: Documentation (API docs, runbooks)

---

**End of Design Document**

*This is a CONCEPTUAL design document. Implementation details (full code, schemas) will be created during development phases.*
