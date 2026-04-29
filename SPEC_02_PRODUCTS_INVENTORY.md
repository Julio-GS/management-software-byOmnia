# SPEC_02_PRODUCTS_INVENTORY - Backend Refactor
## ProductosModule, LotesModule, InventoryModule

**Project:** management-software-byomnia  
**Phase:** SPEC (Specifications)  
**Modules:** 3 Core Business Modules  
**Approach:** Clean Slate  
**Dependencies:** SharedModule, AuthModule, UnidadesMedidaModule, ProveedoresModule, RubrosModule

---

## TABLE OF CONTENTS

1. [ProductosModule](#1-productosmodule)
   - API Contracts
   - DTOs
   - Business Rules (Códigos Especiales F/V/P/C)
   - Repository Queries
   - Tests
   - Guards

2. [LotesModule](#2-lotesmodule)
   - API Contracts
   - DTOs
   - Business Rules (FEFO)
   - Repository Queries
   - Tests
   - Guards

3. [InventoryModule](#3-inventorymodule)
   - API Contracts
   - DTOs
   - Business Rules (Movimientos Stock, Recepción)
   - Repository Queries
   - Tests
   - Guards

---

## 1. PRODUCTOSMODULE

### 1.1 API Contracts

```typescript
// GET /productos?search=leche&rubro_id=uuid&activo=true&page=1&limit=20
// GET /productos/:id
// GET /productos/codigo/:codigo (búsqueda por código o código_barras)
// POST /productos
// PATCH /productos/:id
// PATCH /productos/:id/precio (actualizar precio + historial)
// PATCH /productos/:id/costo (actualizar costo + historial)
// DELETE /productos/:id (soft delete → activo=false)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 1.2 Key DTOs

```typescript
// create-producto.dto.ts
export class CreateProductoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  codigo: string; // "001234" o "F" o "V" o "P" o "C"

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_alternativo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_barras?: string; // EAN-13, UPC-A

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  detalle: string; // "Leche entera La Serenísima 1L"

  @IsOptional()
  @IsUUID()
  proveedor_id?: string;

  @IsOptional()
  @IsUUID()
  rubro_id?: string;

  @IsOptional()
  @IsUUID()
  unidad_medida_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999.999)
  contenido?: number; // 1.0 (litros), 500 (gramos)

  @IsOptional()
  @IsBoolean()
  es_codigo_especial?: boolean; // Auto-calculado desde código

  @IsOptional()
  @IsBoolean()
  requiere_precio_manual?: boolean; // true si código in ['F','V','P','C']

  @IsOptional()
  @IsBoolean()
  maneja_lotes?: boolean; // true para perecederos

  @IsNumber()
  @Min(0)
  @Max(999999.99)
  costo: number; // Costo de compra

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva?: number; // 21, 10.5, 0

  @IsNumber()
  @Min(0)
  @Max(999999.99)
  precio_venta: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99999)
  stock_minimo?: number; // Default: 20

  @IsOptional()
  @IsBoolean()
  maneja_stock?: boolean; // Default: true (false para códigos especiales)
}

// update-producto.dto.ts
export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// update-precio.dto.ts
export class UpdatePrecioDto {
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  precio_nuevo: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string; // "Ajuste por inflación", "Promoción"
}

// update-costo.dto.ts
export class UpdateCostoDto {
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  costo_nuevo: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string; // "Actualización proveedor"
}

// query-producto.dto.ts
export class QueryProductoDto {
  @IsOptional()
  @IsString()
  search?: string; // Full-text search en detalle, código

  @IsOptional()
  @IsUUID()
  rubro_id?: string;

  @IsOptional()
  @IsUUID()
  proveedor_id?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  maneja_lotes?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number; // Default: 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number; // Default: 20
}
```

### 1.3 Business Rules (Códigos Especiales F/V/P/C)

#### 1.3.1 Códigos Especiales
- **Códigos válidos:** `F`, `V`, `P`, `C` (Frutas, Verduras, Pescado, Carnes)
- **Son productos REALES:** Se crean en tabla `productos` como cualquier otro
- **Flags automáticos:**
  - `es_codigo_especial = true`
  - `requiere_precio_manual = true`
  - `maneja_stock = false`
  - `maneja_lotes = false`
- **Precio manual:** Frontend detecta código especial y solicita precio al cajero
  - Validación: `0 < precio_manual < 999999`
  - Se guarda en `detalle_ventas.precio_unitario`
  - NO modifica `productos.precio_venta`
- **No afectan stock:** No descontar de `productos.stock` ni `lotes`

#### 1.3.2 Validaciones de Código
- **Unicidad:** `codigo` único (required)
- **Formato:** No validar formato específico (puede ser alfanumérico)
- **código_barras:** Opcional, validar formato EAN-13 o UPC-A si provisto
- **Auto-detect códigos especiales:** Si `codigo IN ['F','V','P','C']` → auto-set flags

#### 1.3.3 Stock Mínimo
- **Default:** `stock_minimo = 20`
- **Editable:** Usuario puede cambiar por producto
- **Productos sin stock:** Si `maneja_stock = false` → `stock_minimo = NULL`
- **Alertas:** Trigger cuando `stock_actual < stock_minimo`

#### 1.3.4 Manejo de Lotes
- **Perecederos:** `maneja_lotes = true`
- **No perecederos:** `maneja_lotes = false`
- **Restricción:** Si `maneja_lotes = false` → no crear lotes en tabla `lotes`

#### 1.3.5 Soft Delete
- **Marca:** `activo = false`
- **Restricción FK:** No desactivar si:
  - Tiene lotes con `cantidad_actual > 0`
  - Tiene movimientos_stock recientes (últimos 30 días)

#### 1.3.6 Historial de Precios
- **Trigger:** Crear registro en `precios_historia` cuando cambia `precio_venta` o `costo`
- **Campos:**
  - `precio_anterior`, `precio_nuevo` (si cambia precio_venta)
  - `costo_anterior`, `costo_nuevo` (si cambia costo)
  - `tipo_cambio`: "precio" | "costo" | "ambos"
  - `porcentaje_variacion`: calculado automáticamente
  - `motivo`: opcional (puede ser NULL)
- **Casos:**
  - Actualización manual de precio
  - Actualización manual de costo
  - Recepción de mercadería con costo editado

### 1.4 Repository Queries

```typescript
// productos.repository.ts

// GET all con paginación y filtros
async findAll(query: QueryProductoDto) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    activo: query.activo ?? true,
  };

  // Full-text search en detalle (trigram index) o código
  if (query.search) {
    where.OR = [
      { detalle: { contains: query.search, mode: 'insensitive' } },
      { codigo: { contains: query.search, mode: 'insensitive' } },
      { codigo_barras: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.rubro_id) where.rubro_id = query.rubro_id;
  if (query.proveedor_id) where.proveedor_id = query.proveedor_id;
  if (query.maneja_lotes !== undefined) where.maneja_lotes = query.maneja_lotes;

  const [items, total] = await Promise.all([
    prisma.productos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { detalle: 'asc' },
      include: {
        rubros: { select: { id: true, nombre: true } },
        proveedores: { select: { id: true, nombre: true } },
        unidades_medida: { select: { id: true, nombre: true, abreviatura: true } },
        _count: { select: { lotes: true } },
      },
    }),
    prisma.productos.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// GET by ID
async findById(id: string) {
  const producto = await prisma.productos.findUnique({
    where: { id },
    include: {
      rubros: true,
      proveedores: true,
      unidades_medida: true,
      lotes: {
        where: { activo: true, cantidad_actual: { gt: 0 } },
        orderBy: { fecha_vencimiento: 'asc' }, // FEFO
      },
      precios_historia: {
        orderBy: { fecha_cambio: 'desc' },
        take: 10,
      },
    },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');
  return producto;
}

// GET by código (búsqueda por código o código_barras)
async findByCodigo(codigo: string) {
  const producto = await prisma.productos.findFirst({
    where: {
      OR: [
        { codigo },
        { codigo_barras: codigo },
        { codigo_alternativo: codigo },
      ],
      activo: true,
    },
    include: {
      rubros: { select: { id: true, nombre: true } },
      proveedores: { select: { id: true, nombre: true } },
      unidades_medida: { select: { id: true, nombre: true, abreviatura: true } },
      lotes: {
        where: { activo: true, cantidad_actual: { gt: 0 } },
        orderBy: { fecha_vencimiento: 'asc' }, // FEFO
        take: 1,
      },
    },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');
  return producto;
}

// POST create
async create(dto: CreateProductoDto, userId: string) {
  // Auto-detect códigos especiales
  const codigosEspeciales = ['F', 'V', 'P', 'C'];
  const esCodEspecial = codigosEspeciales.includes(dto.codigo.toUpperCase());

  if (esCodEspecial) {
    dto.es_codigo_especial = true;
    dto.requiere_precio_manual = true;
    dto.maneja_stock = false;
    dto.maneja_lotes = false;
    dto.stock_minimo = null;
  }

  // Validar código único
  const exists = await prisma.productos.findUnique({
    where: { codigo: dto.codigo },
  });
  if (exists) throw new ConflictException('Código ya existe');

  // Validar código_barras único si provisto
  if (dto.codigo_barras) {
    const barrasExists = await prisma.productos.findFirst({
      where: { codigo_barras: dto.codigo_barras },
    });
    if (barrasExists) throw new ConflictException('Código de barras ya existe');
  }

  // Default stock_minimo = 20 si maneja_stock = true
  if (dto.maneja_stock !== false && dto.stock_minimo === undefined) {
    dto.stock_minimo = 20;
  }

  const producto = await prisma.productos.create({
    data: {
      ...dto,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Crear historial inicial de precios
  await prisma.precios_historia.create({
    data: {
      producto_id: producto.id,
      precio_anterior: null,
      costo_anterior: null,
      precio_nuevo: producto.precio_venta,
      costo_nuevo: producto.costo,
      tipo_cambio: 'ambos',
      motivo: 'Creación de producto',
      usuario_id: userId,
      porcentaje_variacion: null,
    },
  });

  return this.findById(producto.id);
}

// PATCH update
async update(id: string, dto: UpdateProductoDto, userId: string) {
  const producto = await this.findById(id);

  // Si cambia código, validar unicidad
  if (dto.codigo && dto.codigo !== producto.codigo) {
    const duplicate = await prisma.productos.findFirst({
      where: { codigo: dto.codigo, id: { not: id } },
    });
    if (duplicate) throw new ConflictException('Código ya existe');
  }

  // Si cambia código_barras, validar unicidad
  if (dto.codigo_barras && dto.codigo_barras !== producto.codigo_barras) {
    const barrasDuplicate = await prisma.productos.findFirst({
      where: { codigo_barras: dto.codigo_barras, id: { not: id } },
    });
    if (barrasDuplicate) throw new ConflictException('Código de barras ya existe');
  }

  return prisma.productos.update({
    where: { id },
    data: { ...dto, updated_at: new Date() },
  });
}

// PATCH update precio (con historial)
async updatePrecio(id: string, dto: UpdatePrecioDto, userId: string) {
  const producto = await this.findById(id);

  if (dto.precio_nuevo === producto.precio_venta) {
    throw new BadRequestException('Precio nuevo debe ser diferente al actual');
  }

  const porcentajeVariacion = 
    ((dto.precio_nuevo - producto.precio_venta) / producto.precio_venta) * 100;

  // Actualizar producto + crear historial en transacción
  return prisma.$transaction(async (tx) => {
    await tx.productos.update({
      where: { id },
      data: { precio_venta: dto.precio_nuevo, updated_at: new Date() },
    });

    await tx.precios_historia.create({
      data: {
        producto_id: id,
        precio_anterior: producto.precio_venta,
        precio_nuevo: dto.precio_nuevo,
        costo_anterior: null,
        costo_nuevo: null,
        tipo_cambio: 'precio',
        motivo: dto.motivo || null,
        usuario_id: userId,
        porcentaje_variacion: porcentajeVariacion,
      },
    });

    return this.findById(id);
  });
}

// PATCH update costo (con historial)
async updateCosto(id: string, dto: UpdateCostoDto, userId: string) {
  const producto = await this.findById(id);

  if (dto.costo_nuevo === producto.costo) {
    throw new BadRequestException('Costo nuevo debe ser diferente al actual');
  }

  const porcentajeVariacion = 
    ((dto.costo_nuevo - producto.costo) / producto.costo) * 100;

  return prisma.$transaction(async (tx) => {
    await tx.productos.update({
      where: { id },
      data: { costo: dto.costo_nuevo, updated_at: new Date() },
    });

    await tx.precios_historia.create({
      data: {
        producto_id: id,
        precio_anterior: null,
        precio_nuevo: null,
        costo_anterior: producto.costo,
        costo_nuevo: dto.costo_nuevo,
        tipo_cambio: 'costo',
        motivo: dto.motivo || null,
        usuario_id: userId,
        porcentaje_variacion: porcentajeVariacion,
      },
    });

    return this.findById(id);
  });
}

// DELETE soft delete
async softDelete(id: string) {
  const producto = await this.findById(id);

  // Validar que no tenga lotes con stock
  const lotesConStock = await prisma.lotes.count({
    where: { producto_id: id, cantidad_actual: { gt: 0 } },
  });
  if (lotesConStock > 0) {
    throw new ConflictException(
      `No se puede desactivar: ${lotesConStock} lotes con stock disponible`
    );
  }

  // Validar que no tenga movimientos recientes (últimos 30 días)
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 30);

  const movimientosRecientes = await prisma.movimientos_stock.count({
    where: {
      producto_id: id,
      fecha: { gte: fechaLimite },
    },
  });
  if (movimientosRecientes > 0) {
    throw new ConflictException(
      `No se puede desactivar: ${movimientosRecientes} movimientos de stock en últimos 30 días`
    );
  }

  return prisma.productos.update({
    where: { id },
    data: { activo: false, updated_at: new Date() },
  });
}
```

### 1.5 Critical Tests

```typescript
describe('ProductosService', () => {
  // ✅ POST create - auto-detect código especial "F"
  it('should auto-set flags for special code "F"', async () => {
    // When: create({ codigo: "F", detalle: "Frutas varias" })
    // Then: producto.es_codigo_especial = true
    //       producto.requiere_precio_manual = true
    //       producto.maneja_stock = false
    //       producto.maneja_lotes = false
    //       producto.stock_minimo = null
  });

  // ✅ POST create - producto normal con stock_minimo default
  it('should set stock_minimo = 20 for normal products', async () => {
    // When: create({ codigo: "001234", maneja_stock: true })
    // Then: producto.stock_minimo = 20
  });

  // ✅ POST create - código único
  it('should reject duplicate código', async () => {
    // Given: producto exists with codigo "001234"
    // When: create({ codigo: "001234" })
    // Then: throw ConflictException "Código ya existe"
  });

  // ✅ POST create - código_barras único
  it('should reject duplicate código_barras', async () => {
    // Given: producto exists with codigo_barras "7790001001234"
    // When: create({ codigo_barras: "7790001001234" })
    // Then: throw ConflictException "Código de barras ya existe"
  });

  // ✅ POST create - historial inicial
  it('should create initial price history', async () => {
    // When: create({ precio_venta: 100, costo: 60 })
    // Then: precios_historia has 1 record
    //       tipo_cambio = 'ambos'
    //       motivo = 'Creación de producto'
  });

  // ✅ PATCH update precio - create historial
  it('should update precio and create history', async () => {
    // Given: producto with precio_venta = 100
    // When: updatePrecio(id, { precio_nuevo: 120, motivo: "Ajuste inflación" })
    // Then: producto.precio_venta = 120
    //       precios_historia has new record with tipo_cambio = 'precio'
    //       porcentaje_variacion = 20.00
  });

  // ✅ PATCH update costo - create historial
  it('should update costo and create history', async () => {
    // Given: producto with costo = 60
    // When: updateCosto(id, { costo_nuevo: 70 })
    // Then: producto.costo = 70
    //       precios_historia has new record with tipo_cambio = 'costo'
    //       porcentaje_variacion = 16.67
  });

  // ✅ DELETE soft delete - block if lotes con stock
  it('should block soft delete if lotes con stock > 0', async () => {
    // Given: producto has 2 lotes with cantidad_actual > 0
    // When: softDelete(id)
    // Then: throw ConflictException "2 lotes con stock disponible"
  });

  // ✅ DELETE soft delete - block if movimientos recientes
  it('should block soft delete if movimientos últimos 30 días', async () => {
    // Given: producto has movimientos_stock in last 15 days
    // When: softDelete(id)
    // Then: throw ConflictException "movimientos de stock en últimos 30 días"
  });

  // ✅ GET by código - find by código_barras
  it('should find by código_barras', async () => {
    // Given: producto with codigo="001234", codigo_barras="7790001001234"
    // When: findByCodigo("7790001001234")
    // Then: returns producto
  });

  // ✅ GET all - pagination
  it('should paginate results', async () => {
    // Given: DB has 50 productos
    // When: findAll({ page: 2, limit: 20 })
    // Then: returns items[20..39], totalPages = 3
  });
});
```

### 1.6 Guards

```typescript
// productos.controller.ts
@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryProductoDto) { }

  @Get('codigo/:codigo')
  @Roles('cajero', 'encargado', 'admin')
  findByCodigo(@Param('codigo') codigo: string) { }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findById(@Param('id') id: string) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreateProductoDto, @User() user) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) { }

  @Patch(':id/precio')
  @Roles('encargado', 'admin')
  updatePrecio(@Param('id') id: string, @Body() dto: UpdatePrecioDto, @User() user) { }

  @Patch(':id/costo')
  @Roles('encargado', 'admin')
  updateCosto(@Param('id') id: string, @Body() dto: UpdateCostoDto, @User() user) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  softDelete(@Param('id') id: string) { }
}
```

---

## 2. LOTESMODULE

### 2.1 API Contracts

```typescript
// GET /lotes?producto_id=uuid&activo=true&vencimiento_desde=2026-01-01&vencimiento_hasta=2026-12-31
// GET /lotes/:id
// GET /lotes/producto/:producto_id (todos los lotes de un producto, FEFO order)
// GET /lotes/vencidos (lotes con fecha_vencimiento < today)
// GET /lotes/por-vencer (lotes con fecha_vencimiento < today + 7 días)
// POST /lotes (crear lote manual o auto-generado)
// PATCH /lotes/:id
// DELETE /lotes/:id (solo si cantidad_actual = 0)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 2.2 Key DTOs

```typescript
// create-lote.dto.ts
export class CreateLoteDto {
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_lote?: string; // Si no provisto → auto-generate LOTE-YYYYMMDD-NNN

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string; // "2026-12-31" (opcional, puede ser null)

  @IsInt()
  @Min(1)
  @Max(999999)
  cantidad_inicial: number;
}

// update-lote.dto.ts
export class UpdateLoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_lote?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// query-lote.dto.ts
export class QueryLoteDto {
  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsDateString()
  vencimiento_desde?: string; // "2026-01-01"

  @IsOptional()
  @IsDateString()
  vencimiento_hasta?: string; // "2026-12-31"

  @IsOptional()
  @IsBoolean()
  solo_con_stock?: boolean; // cantidad_actual > 0
}
```

### 2.3 Business Rules (FEFO)

#### 2.3.1 FEFO (First Expired, First Out)
- **Orden de venta:** Siempre vender del lote con `fecha_vencimiento` más cercana
- **Query order:** `ORDER BY fecha_vencimiento ASC NULLS LAST`
- **Sin bloqueos:** Vender hasta el último día de vencimiento (inclusive)
- **Sin warnings:** No alertar al cajero si lote está por vencer
- **Alertas proactivas:** Dashboard muestra lotes por vencer (< 7 días)

#### 2.3.2 Auto-generación de Número de Lote
- **Formato:** `LOTE-YYYYMMDD-NNN`
  - `YYYYMMDD`: fecha de ingreso (ejemplo: `20260420`)
  - `NNN`: secuencial del día (001, 002, ...)
- **Trigger:** Si `numero_lote` no provisto en POST → auto-generar
- **Unicidad:** `(producto_id, numero_lote)` único

#### 2.3.3 Cantidad Actual
- **Default:** `cantidad_actual = cantidad_inicial` al crear
- **Descuentos:** Solo por ventas o ajustes de inventario
- **FEFO automático:** Al vender, descontar del lote más viejo primero

#### 2.3.4 Lotes Vencidos
- **Marca:** No marcar como `activo=false` automáticamente
- **Permite venta:** Vender hasta el último día (inclusive)
- **Dashboard:** Listar lotes vencidos para acción manual
- **Devoluciones:** Permitir devolución a lote vencido si existe

#### 2.3.5 Soft Delete
- **Restricción:** Solo permitir `DELETE` si `cantidad_actual = 0`
- **No delete físico:** Solo soft delete (`activo = false`)

### 2.4 Repository Queries

```typescript
// lotes.repository.ts

// GET all con filtros
async findAll(query: QueryLoteDto) {
  const where: any = {
    activo: query.activo ?? true,
  };

  if (query.producto_id) where.producto_id = query.producto_id;
  if (query.solo_con_stock) where.cantidad_actual = { gt: 0 };

  // Filtro de rango de vencimiento
  if (query.vencimiento_desde || query.vencimiento_hasta) {
    where.fecha_vencimiento = {};
    if (query.vencimiento_desde) {
      where.fecha_vencimiento.gte = new Date(query.vencimiento_desde);
    }
    if (query.vencimiento_hasta) {
      where.fecha_vencimiento.lte = new Date(query.vencimiento_hasta);
    }
  }

  return prisma.lotes.findMany({
    where,
    orderBy: [
      { fecha_vencimiento: 'asc' }, // FEFO
      { fecha_ingreso: 'asc' },
    ],
    include: {
      productos: {
        select: { id: true, codigo: true, detalle: true },
      },
    },
  });
}

// GET by ID
async findById(id: string) {
  const lote = await prisma.lotes.findUnique({
    where: { id },
    include: {
      productos: true,
      movimientos_stock: {
        orderBy: { fecha: 'desc' },
        take: 20,
      },
    },
  });
  if (!lote) throw new NotFoundException('Lote no encontrado');
  return lote;
}

// GET lotes de un producto (FEFO order)
async findByProducto(productoId: string) {
  const producto = await prisma.productos.findUnique({
    where: { id: productoId },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  return prisma.lotes.findMany({
    where: {
      producto_id: productoId,
      activo: true,
      cantidad_actual: { gt: 0 },
    },
    orderBy: [
      { fecha_vencimiento: 'asc' }, // FEFO
      { fecha_ingreso: 'asc' },
    ],
  });
}

// GET lotes vencidos (fecha_vencimiento < today)
async findVencidos() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.lotes.findMany({
    where: {
      activo: true,
      cantidad_actual: { gt: 0 },
      fecha_vencimiento: { lt: today },
    },
    orderBy: { fecha_vencimiento: 'asc' },
    include: {
      productos: {
        select: { id: true, codigo: true, detalle: true },
      },
    },
  });
}

// GET lotes por vencer (< 7 días)
async findPorVencer() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limite = new Date(today);
  limite.setDate(limite.getDate() + 7);

  return prisma.lotes.findMany({
    where: {
      activo: true,
      cantidad_actual: { gt: 0 },
      fecha_vencimiento: {
        gte: today,
        lte: limite,
      },
    },
    orderBy: { fecha_vencimiento: 'asc' },
    include: {
      productos: {
        select: { id: true, codigo: true, detalle: true },
      },
    },
  });
}

// POST create
async create(dto: CreateLoteDto) {
  // Validar que producto existe y maneja_lotes = true
  const producto = await prisma.productos.findUnique({
    where: { id: dto.producto_id },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');
  if (!producto.maneja_lotes) {
    throw new BadRequestException('Producto no maneja lotes');
  }

  // Auto-generar numero_lote si no provisto
  let numeroLote = dto.numero_lote;
  if (!numeroLote) {
    numeroLote = await this.generateNumeroLote(dto.producto_id);
  }

  // Validar unicidad (producto_id, numero_lote)
  const exists = await prisma.lotes.findFirst({
    where: {
      producto_id: dto.producto_id,
      numero_lote: numeroLote,
    },
  });
  if (exists) {
    throw new ConflictException('Número de lote ya existe para este producto');
  }

  return prisma.lotes.create({
    data: {
      producto_id: dto.producto_id,
      numero_lote: numeroLote,
      fecha_vencimiento: dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : null,
      cantidad_inicial: dto.cantidad_inicial,
      cantidad_actual: dto.cantidad_inicial, // Default = cantidad_inicial
      fecha_ingreso: new Date(),
      activo: true,
    },
  });
}

// Helper: generar numero_lote automático
private async generateNumeroLote(productoId: string): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, ''); // "20260420"

  // Buscar último lote del día para este producto
  const prefix = `LOTE-${yyyymmdd}-`;
  const ultimoLote = await prisma.lotes.findFirst({
    where: {
      producto_id: productoId,
      numero_lote: { startsWith: prefix },
    },
    orderBy: { numero_lote: 'desc' },
  });

  let secuencial = 1;
  if (ultimoLote) {
    const match = ultimoLote.numero_lote.match(/-(\d{3})$/);
    if (match) {
      secuencial = parseInt(match[1], 10) + 1;
    }
  }

  const nnn = secuencial.toString().padStart(3, '0'); // "001", "002", ...
  return `${prefix}${nnn}`; // "LOTE-20260420-001"
}

// PATCH update
async update(id: string, dto: UpdateLoteDto) {
  const lote = await this.findById(id);

  // Si cambia numero_lote, validar unicidad
  if (dto.numero_lote && dto.numero_lote !== lote.numero_lote) {
    const duplicate = await prisma.lotes.findFirst({
      where: {
        producto_id: lote.producto_id,
        numero_lote: dto.numero_lote,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new ConflictException('Número de lote ya existe para este producto');
    }
  }

  return prisma.lotes.update({
    where: { id },
    data: {
      ...dto,
      fecha_vencimiento: dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : undefined,
    },
  });
}

// DELETE (solo si cantidad_actual = 0)
async delete(id: string) {
  const lote = await this.findById(id);

  if (lote.cantidad_actual > 0) {
    throw new ConflictException(
      `No se puede eliminar: lote tiene ${lote.cantidad_actual} unidades en stock`
    );
  }

  // Soft delete
  return prisma.lotes.update({
    where: { id },
    data: { activo: false },
  });
}
```

### 2.5 Critical Tests

```typescript
describe('LotesService', () => {
  // ✅ POST create - auto-generate numero_lote
  it('should auto-generate numero_lote format LOTE-YYYYMMDD-NNN', async () => {
    // When: create({ producto_id: uuid, cantidad_inicial: 100 })
    // Then: lote.numero_lote matches /^LOTE-\d{8}-\d{3}$/
    //       ejemplo: "LOTE-20260420-001"
  });

  // ✅ POST create - sequential numero_lote same day
  it('should generate sequential numero_lote for same day', async () => {
    // Given: today has lote "LOTE-20260420-001" for producto X
    // When: create({ producto_id: X, cantidad_inicial: 50 })
    // Then: lote.numero_lote = "LOTE-20260420-002"
  });

  // ✅ POST create - validate maneja_lotes = true
  it('should reject create if producto.maneja_lotes = false', async () => {
    // Given: producto with maneja_lotes = false
    // When: create({ producto_id: uuid })
    // Then: throw BadRequestException "Producto no maneja lotes"
  });

  // ✅ POST create - unique (producto_id, numero_lote)
  it('should reject duplicate (producto_id, numero_lote)', async () => {
    // Given: lote exists with producto_id=X, numero_lote="LOTE-001"
    // When: create({ producto_id: X, numero_lote: "LOTE-001" })
    // Then: throw ConflictException "Número de lote ya existe"
  });

  // ✅ GET by producto - FEFO order
  it('should return lotes ordered by fecha_vencimiento ASC (FEFO)', async () => {
    // Given: producto has 3 lotes with vencimiento [2026-12-31, 2026-06-15, 2026-09-20]
    // When: findByProducto(producto_id)
    // Then: returns lotes ordered [2026-06-15, 2026-09-20, 2026-12-31]
  });

  // ✅ GET vencidos
  it('should return lotes with fecha_vencimiento < today', async () => {
    // Given: today = 2026-04-20
    //        lotes with vencimiento [2026-04-19, 2026-04-21, 2026-05-01]
    // When: findVencidos()
    // Then: returns [2026-04-19], length = 1
  });

  // ✅ GET por vencer
  it('should return lotes venciendo en próximos 7 días', async () => {
    // Given: today = 2026-04-20
    //        lotes with vencimiento [2026-04-22, 2026-04-27, 2026-05-01]
    // When: findPorVencer()
    // Then: returns [2026-04-22, 2026-04-27], length = 2
  });

  // ✅ DELETE - block if cantidad_actual > 0
  it('should block delete if cantidad_actual > 0', async () => {
    // Given: lote with cantidad_actual = 50
    // When: delete(id)
    // Then: throw ConflictException "lote tiene 50 unidades en stock"
  });

  // ✅ DELETE - allow if cantidad_actual = 0
  it('should allow delete if cantidad_actual = 0', async () => {
    // Given: lote with cantidad_actual = 0
    // When: delete(id)
    // Then: lote.activo = false, success
  });
});
```

### 2.6 Guards

```typescript
@Controller('lotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LotesController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryLoteDto) { }

  @Get('vencidos')
  @Roles('encargado', 'admin')
  findVencidos() { }

  @Get('por-vencer')
  @Roles('encargado', 'admin')
  findPorVencer() { }

  @Get('producto/:producto_id')
  @Roles('cajero', 'encargado', 'admin')
  findByProducto(@Param('producto_id') productoId: string) { }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findById(@Param('id') id: string) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreateLoteDto) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateLoteDto) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  delete(@Param('id') id: string) { }
}
```

---

## 3. INVENTORYMODULE

### 3.1 API Contracts

```typescript
// GET /inventory/movimientos?producto_id=uuid&tipo=ingreso&fecha_desde=2026-01-01&page=1&limit=20
// GET /inventory/movimientos/:id
// POST /inventory/recepcion (recepción de mercadería con lote)
// POST /inventory/ajuste (ajuste manual de stock)
// POST /inventory/merma (registrar merma/pérdida)
// GET /inventory/stock-bajo (productos con stock < stock_minimo)
// GET /inventory/productos/:id/movimientos (historial de un producto)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST`: encargado, admin

### 3.2 Key DTOs

```typescript
// recepcion-mercaderia.dto.ts
export class RecepcionMercaderiaDto {
  @IsUUID()
  producto_id: string;

  @IsInt()
  @Min(1)
  @Max(999999)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_lote?: string; // Si no provisto → auto-generate

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string; // Solo si producto.maneja_lotes = true

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  costo?: number; // Si provisto → actualizar productos.costo

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo_costo?: string; // Motivo del cambio de costo

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string; // "Factura A-0001234", "Remito R-5678"

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ajuste-stock.dto.ts
export class AjusteStockDto {
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string; // Si producto maneja lotes

  @IsIn(['ingreso', 'egreso'])
  tipo_ajuste: string; // "ingreso" o "egreso"

  @IsInt()
  @Min(1)
  @Max(999999)
  cantidad: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string; // "Corrección inventario", "Robo", etc.

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// merma.dto.ts
export class MermaDto {
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string; // Si producto maneja lotes

  @IsInt()
  @Min(1)
  @Max(999999)
  cantidad: number;

  @IsIn(['vencimiento', 'rotura', 'deterioro', 'otro'])
  tipo_merma: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// query-movimiento.dto.ts
export class QueryMovimientoDto {
  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string;

  @IsOptional()
  @IsIn(['ingreso', 'egreso', 'ajuste', 'venta', 'devolucion', 'merma'])
  tipo_movimiento?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

### 3.3 Business Rules (Movimientos Stock, Recepción)

#### 3.3.1 Tipos de Movimientos
- **ingreso:** Recepción de mercadería, ajuste positivo
- **egreso:** Venta, ajuste negativo, merma
- **ajuste:** Corrección manual (puede ser ingreso o egreso)
- **venta:** Descuento automático por venta (trigger desde VentasModule)
- **devolucion:** Incremento automático por devolución (trigger desde DevolucionesModule)
- **merma:** Pérdida por vencimiento, rotura, deterioro

#### 3.3.2 Recepción de Mercadería
- **Flujo:**
  1. Validar que `producto_id` existe
  2. Si `producto.maneja_lotes = true`:
     - Crear lote (auto-generate `numero_lote` si no provisto)
     - Vincular movimiento a `lote_id`
  3. Si `producto.maneja_lotes = false`:
     - No crear lote
     - Incrementar `productos.stock` directamente (stock general)
  4. Si `costo` provisto:
     - Actualizar `productos.costo`
     - Crear registro en `precios_historia` con `tipo_cambio = 'costo'`
  5. Crear registro en `movimientos_stock` con `tipo_movimiento = 'ingreso'`

- **Idempotencia:** Si se edita el costo en recepción, actualizar `productos.costo` siempre (sin validar si es diferente)

#### 3.3.3 Ajuste de Stock
- **Positivo (ingreso):** Incrementar `cantidad_actual` del lote o stock general
- **Negativo (egreso):** Decrementar `cantidad_actual` del lote o stock general
- **Validación:** Al decrementar, validar que `cantidad_actual >= cantidad`
- **Motivo obligatorio:** Siempre requerir `motivo` en ajustes

#### 3.3.4 Merma
- **Flujo:**
  1. Validar `producto_id` y `lote_id` (si aplica)
  2. Decrementar `cantidad_actual` del lote o stock general
  3. Crear registro en `movimientos_stock` con `tipo_movimiento = 'merma'`
  4. Opcional: marcar lote como `activo = false` si `cantidad_actual = 0`

#### 3.3.5 Stock Bajo
- **Criterio:** `productos.stock_actual < productos.stock_minimo`
- **Cálculo stock_actual:**
  - Si `maneja_lotes = true`: `SUM(lotes.cantidad_actual)`
  - Si `maneja_lotes = false`: campo `productos.stock` (no existe en schema actual, usar vista o query)
- **Dashboard:** Endpoint `/inventory/stock-bajo` para alertas

#### 3.3.6 Historial de Precios en Recepción
- **Trigger:** Si `costo` provisto en recepción → crear historial
- **Campos:**
  - `costo_anterior`: valor actual en `productos.costo`
  - `costo_nuevo`: valor provisto en recepción
  - `tipo_cambio`: "costo"
  - `motivo`: `motivo_costo` o NULL
  - `usuario_id`: usuario que hizo la recepción

### 3.4 Repository Queries

```typescript
// inventory.repository.ts

// GET movimientos con filtros y paginación
async findMovimientos(query: QueryMovimientoDto) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.producto_id) where.producto_id = query.producto_id;
  if (query.lote_id) where.lote_id = query.lote_id;
  if (query.tipo_movimiento) where.tipo_movimiento = query.tipo_movimiento;

  // Filtro de rango de fechas
  if (query.fecha_desde || query.fecha_hasta) {
    where.fecha = {};
    if (query.fecha_desde) {
      where.fecha.gte = new Date(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      where.fecha.lte = new Date(query.fecha_hasta);
    }
  }

  const [items, total] = await Promise.all([
    prisma.movimientos_stock.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: {
        productos: {
          select: { id: true, codigo: true, detalle: true },
        },
        lotes: {
          select: { id: true, numero_lote: true, fecha_vencimiento: true },
        },
      },
    }),
    prisma.movimientos_stock.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// GET movimientos de un producto
async findMovimientosByProducto(productoId: string, limit = 50) {
  const producto = await prisma.productos.findUnique({
    where: { id: productoId },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  return prisma.movimientos_stock.findMany({
    where: { producto_id: productoId },
    orderBy: { fecha: 'desc' },
    take: limit,
    include: {
      lotes: {
        select: { id: true, numero_lote: true },
      },
    },
  });
}

// POST recepción de mercadería
async recepcionMercaderia(dto: RecepcionMercaderiaDto, userId: string) {
  // Validar producto existe
  const producto = await prisma.productos.findUnique({
    where: { id: dto.producto_id },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  return prisma.$transaction(async (tx) => {
    let loteId: string | null = null;

    // Si producto maneja lotes → crear/vincular lote
    if (producto.maneja_lotes) {
      const lote = await tx.lotes.create({
        data: {
          producto_id: dto.producto_id,
          numero_lote: dto.numero_lote || await this.generateNumeroLote(dto.producto_id),
          fecha_vencimiento: dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : null,
          cantidad_inicial: dto.cantidad,
          cantidad_actual: dto.cantidad,
          fecha_ingreso: new Date(),
          activo: true,
        },
      });
      loteId = lote.id;
    }

    // Si costo provisto → actualizar productos.costo + historial
    if (dto.costo !== undefined && dto.costo !== null) {
      await tx.productos.update({
        where: { id: dto.producto_id },
        data: { costo: dto.costo, updated_at: new Date() },
      });

      const porcentajeVariacion = producto.costo > 0
        ? ((dto.costo - producto.costo) / producto.costo) * 100
        : null;

      await tx.precios_historia.create({
        data: {
          producto_id: dto.producto_id,
          costo_anterior: producto.costo,
          costo_nuevo: dto.costo,
          tipo_cambio: 'costo',
          motivo: dto.motivo_costo || null,
          usuario_id: userId,
          porcentaje_variacion: porcentajeVariacion,
        },
      });
    }

    // Crear movimiento de stock
    const movimiento = await tx.movimientos_stock.create({
      data: {
        producto_id: dto.producto_id,
        lote_id: loteId,
        tipo_movimiento: 'ingreso',
        cantidad: dto.cantidad,
        referencia: dto.referencia || null,
        usuario_id: userId,
        observaciones: dto.observaciones || null,
        fecha: new Date(),
      },
    });

    return movimiento;
  });
}

// Helper: generar numero_lote (igual que en LotesModule)
private async generateNumeroLote(productoId: string): Promise<string> {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `LOTE-${yyyymmdd}-`;

  const ultimoLote = await prisma.lotes.findFirst({
    where: {
      producto_id: productoId,
      numero_lote: { startsWith: prefix },
    },
    orderBy: { numero_lote: 'desc' },
  });

  let secuencial = 1;
  if (ultimoLote) {
    const match = ultimoLote.numero_lote.match(/-(\d{3})$/);
    if (match) {
      secuencial = parseInt(match[1], 10) + 1;
    }
  }

  const nnn = secuencial.toString().padStart(3, '0');
  return `${prefix}${nnn}`;
}

// POST ajuste de stock
async ajusteStock(dto: AjusteStockDto, userId: string) {
  const producto = await prisma.productos.findUnique({
    where: { id: dto.producto_id },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  // Si producto maneja lotes → validar lote_id
  if (producto.maneja_lotes && !dto.lote_id) {
    throw new BadRequestException('lote_id requerido para productos con lotes');
  }

  return prisma.$transaction(async (tx) => {
    // Si es egreso, validar stock disponible
    if (dto.tipo_ajuste === 'egreso') {
      if (dto.lote_id) {
        const lote = await tx.lotes.findUnique({ where: { id: dto.lote_id } });
        if (!lote) throw new NotFoundException('Lote no encontrado');
        if (lote.cantidad_actual < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente: disponible ${lote.cantidad_actual}, solicitado ${dto.cantidad}`
          );
        }
      }
    }

    // Actualizar cantidad en lote
    if (dto.lote_id) {
      const incremento = dto.tipo_ajuste === 'ingreso' ? dto.cantidad : -dto.cantidad;
      await tx.lotes.update({
        where: { id: dto.lote_id },
        data: { cantidad_actual: { increment: incremento } },
      });
    }

    // Crear movimiento
    const cantidad = dto.tipo_ajuste === 'egreso' ? -dto.cantidad : dto.cantidad;
    return tx.movimientos_stock.create({
      data: {
        producto_id: dto.producto_id,
        lote_id: dto.lote_id || null,
        tipo_movimiento: 'ajuste',
        cantidad,
        referencia: dto.referencia || null,
        usuario_id: userId,
        observaciones: `${dto.tipo_ajuste.toUpperCase()}: ${dto.motivo}`,
        fecha: new Date(),
      },
    });
  });
}

// POST merma
async merma(dto: MermaDto, userId: string) {
  const producto = await prisma.productos.findUnique({
    where: { id: dto.producto_id },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  if (producto.maneja_lotes && !dto.lote_id) {
    throw new BadRequestException('lote_id requerido para productos con lotes');
  }

  return prisma.$transaction(async (tx) => {
    // Validar stock disponible
    if (dto.lote_id) {
      const lote = await tx.lotes.findUnique({ where: { id: dto.lote_id } });
      if (!lote) throw new NotFoundException('Lote no encontrado');
      if (lote.cantidad_actual < dto.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente: disponible ${lote.cantidad_actual}, solicitado ${dto.cantidad}`
        );
      }

      // Decrementar lote
      await tx.lotes.update({
        where: { id: dto.lote_id },
        data: { cantidad_actual: { decrement: dto.cantidad } },
      });

      // Si cantidad_actual = 0 → marcar como inactivo
      const loteActualizado = await tx.lotes.findUnique({ where: { id: dto.lote_id } });
      if (loteActualizado.cantidad_actual === 0) {
        await tx.lotes.update({
          where: { id: dto.lote_id },
          data: { activo: false },
        });
      }
    }

    // Crear movimiento
    const observaciones = `MERMA (${dto.tipo_merma}): ${dto.motivo || ''}`;
    return tx.movimientos_stock.create({
      data: {
        producto_id: dto.producto_id,
        lote_id: dto.lote_id || null,
        tipo_movimiento: 'merma',
        cantidad: -dto.cantidad,
        usuario_id: userId,
        observaciones,
        fecha: new Date(),
      },
    });
  });
}

// GET productos con stock bajo
async getStockBajo() {
  // Query compleja: productos con stock actual < stock_minimo
  return prisma.$queryRaw`
    SELECT 
      p.id,
      p.codigo,
      p.detalle,
      p.stock_minimo,
      COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
      p.stock_minimo - COALESCE(SUM(l.cantidad_actual), 0) AS faltante
    FROM productos p
    LEFT JOIN lotes l ON l.producto_id = p.id AND l.activo = true
    WHERE p.activo = true
      AND p.maneja_stock = true
      AND p.stock_minimo > 0
    GROUP BY p.id, p.codigo, p.detalle, p.stock_minimo
    HAVING COALESCE(SUM(l.cantidad_actual), 0) < p.stock_minimo
    ORDER BY faltante DESC
  `;
}
```

### 3.5 Critical Tests

```typescript
describe('InventoryService', () => {
  // ✅ POST recepcion - create lote if maneja_lotes = true
  it('should create lote for producto with maneja_lotes = true', async () => {
    // Given: producto with maneja_lotes = true
    // When: recepcionMercaderia({ producto_id, cantidad: 100 })
    // Then: lotes has new record with cantidad_inicial = 100
    //       movimientos_stock has new record tipo_movimiento = 'ingreso'
  });

  // ✅ POST recepcion - auto-generate numero_lote
  it('should auto-generate numero_lote if not provided', async () => {
    // When: recepcionMercaderia({ producto_id, cantidad: 50 })
    // Then: lote.numero_lote matches /^LOTE-\d{8}-\d{3}$/
  });

  // ✅ POST recepcion - update costo + historial
  it('should update productos.costo and create history', async () => {
    // Given: producto with costo = 60
    // When: recepcionMercaderia({ producto_id, cantidad: 100, costo: 70 })
    // Then: producto.costo = 70
    //       precios_historia has record tipo_cambio = 'costo'
  });

  // ✅ POST recepcion - idempotencia costo
  it('should update costo even if same value (idempotence)', async () => {
    // Given: producto with costo = 60
    // When: recepcionMercaderia({ costo: 60 })
    // Then: productos.costo = 60 (sin cambio)
    //       precios_historia has new record (porcentaje_variacion = 0)
  });

  // ✅ POST ajuste - ingreso increments cantidad_actual
  it('should increment lote.cantidad_actual for tipo_ajuste = ingreso', async () => {
    // Given: lote with cantidad_actual = 100
    // When: ajusteStock({ lote_id, tipo_ajuste: 'ingreso', cantidad: 20 })
    // Then: lote.cantidad_actual = 120
  });

  // ✅ POST ajuste - egreso decrements cantidad_actual
  it('should decrement lote.cantidad_actual for tipo_ajuste = egreso', async () => {
    // Given: lote with cantidad_actual = 100
    // When: ajusteStock({ lote_id, tipo_ajuste: 'egreso', cantidad: 30 })
    // Then: lote.cantidad_actual = 70
  });

  // ✅ POST ajuste - block egreso if stock insuficiente
  it('should reject egreso if stock < cantidad', async () => {
    // Given: lote with cantidad_actual = 10
    // When: ajusteStock({ tipo_ajuste: 'egreso', cantidad: 20 })
    // Then: throw BadRequestException "Stock insuficiente: disponible 10, solicitado 20"
  });

  // ✅ POST merma - decrement lote and create movimiento
  it('should decrement lote and create merma movement', async () => {
    // Given: lote with cantidad_actual = 50
    // When: merma({ lote_id, cantidad: 10, tipo_merma: 'vencimiento' })
    // Then: lote.cantidad_actual = 40
    //       movimientos_stock has tipo_movimiento = 'merma'
  });

  // ✅ POST merma - mark lote inactive if cantidad_actual = 0
  it('should mark lote as activo=false when cantidad_actual = 0', async () => {
    // Given: lote with cantidad_actual = 10
    // When: merma({ lote_id, cantidad: 10 })
    // Then: lote.cantidad_actual = 0
    //       lote.activo = false
  });

  // ✅ GET stock bajo - return productos with stock < stock_minimo
  it('should return productos with stock < stock_minimo', async () => {
    // Given: producto A (stock_minimo=20, stock_actual=15)
    //        producto B (stock_minimo=50, stock_actual=60)
    // When: getStockBajo()
    // Then: returns [producto A], length = 1
  });
});
```

### 3.6 Guards

```typescript
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  @Get('movimientos')
  @Roles('cajero', 'encargado', 'admin')
  findMovimientos(@Query() query: QueryMovimientoDto) { }

  @Get('movimientos/:id')
  @Roles('cajero', 'encargado', 'admin')
  findMovimientoById(@Param('id') id: string) { }

  @Get('productos/:id/movimientos')
  @Roles('cajero', 'encargado', 'admin')
  findMovimientosByProducto(@Param('id') productoId: string) { }

  @Get('stock-bajo')
  @Roles('encargado', 'admin')
  getStockBajo() { }

  @Post('recepcion')
  @Roles('encargado', 'admin')
  recepcionMercaderia(@Body() dto: RecepcionMercaderiaDto, @User() user) { }

  @Post('ajuste')
  @Roles('encargado', 'admin')
  ajusteStock(@Body() dto: AjusteStockDto, @User() user) { }

  @Post('merma')
  @Roles('encargado', 'admin')
  merma(@Body() dto: MermaDto, @User() user) { }
}
```

---

## IMPLEMENTATION CHECKLIST

### ProductosModule
- [ ] `productos.module.ts` (imports, providers, exports)
- [ ] `productos.controller.ts` (8 endpoints + guards)
- [ ] `productos.service.ts` (business logic + códigos especiales)
- [ ] `productos.repository.ts` (9 queries + auto-detect códigos)
- [ ] `dto/create-producto.dto.ts` (18 fields + validators)
- [ ] `dto/update-producto.dto.ts` (extends PartialType)
- [ ] `dto/update-precio.dto.ts` (precio_nuevo + motivo)
- [ ] `dto/update-costo.dto.ts` (costo_nuevo + motivo)
- [ ] `dto/query-producto.dto.ts` (6 filters + pagination)
- [ ] `__tests__/productos.service.spec.ts` (11 tests)
- [ ] `__tests__/productos.e2e-spec.ts` (8 endpoints)

### LotesModule
- [ ] `lotes.module.ts`
- [ ] `lotes.controller.ts` (8 endpoints + guards)
- [ ] `lotes.service.ts` (business logic + FEFO)
- [ ] `lotes.repository.ts` (8 queries + auto-generate lote)
- [ ] `dto/create-lote.dto.ts` (4 fields + validators)
- [ ] `dto/update-lote.dto.ts` (extends PartialType)
- [ ] `dto/query-lote.dto.ts` (5 filters)
- [ ] `__tests__/lotes.service.spec.ts` (9 tests)
- [ ] `__tests__/lotes.e2e-spec.ts` (8 endpoints)

### InventoryModule
- [ ] `inventory.module.ts`
- [ ] `inventory.controller.ts` (7 endpoints + guards)
- [ ] `inventory.service.ts` (business logic + transacciones)
- [ ] `inventory.repository.ts` (6 queries + 1 raw SQL)
- [ ] `dto/recepcion-mercaderia.dto.ts` (8 fields)
- [ ] `dto/ajuste-stock.dto.ts` (6 fields)
- [ ] `dto/merma.dto.ts` (5 fields)
- [ ] `dto/query-movimiento.dto.ts` (6 filters + pagination)
- [ ] `__tests__/inventory.service.spec.ts` (10 tests)
- [ ] `__tests__/inventory.e2e-spec.ts` (7 endpoints)

---

## BUSINESS RULES SUMMARY

| Module | Key Rule | Implementation |
|--------|----------|----------------|
| **Productos** | Códigos F/V/P/C | Auto-set: `es_codigo_especial=true`, `requiere_precio_manual=true`, `maneja_stock=false` |
| | Stock mínimo default | `stock_minimo = 20` si `maneja_stock = true` |
| | Historial precios | Crear registro en `precios_historia` al cambiar `precio_venta` o `costo` |
| | Soft delete block | Rechazar si lotes con stock > 0 OR movimientos últimos 30 días |
| **Lotes** | Auto-generate lote | Formato: `LOTE-YYYYMMDD-NNN` (secuencial por día) |
| | FEFO | `ORDER BY fecha_vencimiento ASC NULLS LAST` |
| | Sin bloqueos vencimiento | Vender hasta último día de vencimiento (inclusive) |
| | Delete block | Solo permitir si `cantidad_actual = 0` |
| **Inventory** | Recepción con costo | Si `costo` provisto → actualizar `productos.costo` + historial (idempotente) |
| | Recepción con lotes | Si `maneja_lotes = true` → crear lote automáticamente |
| | Ajuste stock | Validar `cantidad_actual >= cantidad` al decrementar |
| | Merma | Decrementar lote + marcar `activo=false` si `cantidad_actual = 0` |
| | Stock bajo | Query: `SUM(lotes.cantidad_actual) < productos.stock_minimo` |

---

## CRITICAL QUERIES

### 1. Stock actual por producto (con lotes)
```sql
SELECT 
  p.id,
  p.codigo,
  p.detalle,
  p.stock_minimo,
  COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
FROM productos p
LEFT JOIN lotes l ON l.producto_id = p.id AND l.activo = true
WHERE p.activo = true
GROUP BY p.id, p.codigo, p.detalle, p.stock_minimo;
```

### 2. Productos con stock bajo
```sql
SELECT 
  p.id,
  p.codigo,
  p.detalle,
  p.stock_minimo,
  COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
  p.stock_minimo - COALESCE(SUM(l.cantidad_actual), 0) AS faltante
FROM productos p
LEFT JOIN lotes l ON l.producto_id = p.id AND l.activo = true
WHERE p.activo = true
  AND p.maneja_stock = true
  AND p.stock_minimo > 0
GROUP BY p.id, p.codigo, p.detalle, p.stock_minimo
HAVING COALESCE(SUM(l.cantidad_actual), 0) < p.stock_minimo
ORDER BY faltante DESC;
```

### 3. FEFO: lote más viejo disponible para un producto
```sql
SELECT *
FROM lotes
WHERE producto_id = $1
  AND activo = true
  AND cantidad_actual > 0
ORDER BY fecha_vencimiento ASC NULLS LAST, fecha_ingreso ASC
LIMIT 1;
```

### 4. Lotes vencidos con stock
```sql
SELECT l.*, p.codigo, p.detalle
FROM lotes l
JOIN productos p ON p.id = l.producto_id
WHERE l.activo = true
  AND l.cantidad_actual > 0
  AND l.fecha_vencimiento < CURRENT_DATE
ORDER BY l.fecha_vencimiento ASC;
```

### 5. Lotes por vencer (próximos 7 días)
```sql
SELECT l.*, p.codigo, p.detalle
FROM lotes l
JOIN productos p ON p.id = l.producto_id
WHERE l.activo = true
  AND l.cantidad_actual > 0
  AND l.fecha_vencimiento >= CURRENT_DATE
  AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY l.fecha_vencimiento ASC;
```

---

## DATABASE INDEXES VALIDATION

```sql
-- Validar que estos indexes existan en el schema

-- productos
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_detalle ON productos USING gin(detalle gin_trgm_ops);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_rubro ON productos(rubro_id);

-- lotes
CREATE INDEX idx_lotes_producto ON lotes(producto_id);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE UNIQUE INDEX uq_producto_lote ON lotes(producto_id, numero_lote);

-- movimientos_stock
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_lote ON movimientos_stock(lote_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(fecha DESC);

-- precios_historia
CREATE INDEX idx_precios_hist_producto ON precios_historia(producto_id);
CREATE INDEX idx_precios_hist_fecha ON precios_historia(fecha_cambio DESC);
CREATE INDEX idx_precios_hist_usuario ON precios_historia(usuario_id);
```

---

## END OF SPEC_02_PRODUCTS_INVENTORY

**Next Steps:**
1. Implement ProductosModule first (foundation)
2. Implement LotesModule (depends on ProductosModule)
3. Implement InventoryModule (depends on ProductosModule + LotesModule)
4. Create seeds for códigos especiales (F, V, P, C)
5. Run all tests before moving to SPEC_03_SALES_POS.md

**Total Lines:** ~1245 lines  
**Total Modules:** 3  
**Total Endpoints:** 23  
**Total Tests:** 30 critical test cases  
**Total DTOs:** 11
