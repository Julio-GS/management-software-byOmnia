# SPEC_03_PRICING_PROMOTIONS - Backend Refactor
## PricingModule, PromocionesModule

**Project:** management-software-byomnia  
**Phase:** SPEC (Specifications)  
**Modules:** 2 Business Logic Modules  
**Approach:** Clean Slate  
**Dependencies:** SharedModule, AuthModule, ProductsModule

---

## TABLE OF CONTENTS

1. [PricingModule](#1-pricingmodule)
   - API Contracts
   - DTOs
   - Business Rules (Historial, Bulk Updates, Markup)
   - Repository Queries
   - Tests
   - Guards

2. [PromocionesModule](#2-promocionesmodule)
   - API Contracts
   - DTOs
   - Business Rules (Tipos, Vigencia, Prioridad, Acumulabilidad)
   - Repository Queries
   - Auto-Apply Logic
   - Tests
   - Guards

---

## 1. PRICINGMODULE

### 1.1 API Contracts

```typescript
// GET /pricing/history/:producto_id?limit=10
// GET /pricing/markup/:rubro_id (calcular markup sugerido - NO aplicar)
// PATCH /pricing/update/:producto_id (single update con historial)
// PATCH /pricing/bulk-update (múltiples productos con historial)
// POST /pricing/calculate (calcular precio desde costo + markup + IVA)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `PATCH`: encargado, admin
- `POST calculate`: encargado, admin

### 1.2 Key DTOs

```typescript
// update-precio.dto.ts
export class UpdatePrecioDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number; // Nuevo costo

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_venta?: number; // Nuevo precio venta

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string; // Motivo del cambio (NULLABLE en DB)

  @IsOptional()
  @IsIn(['manual', 'bulk_update', 'markup_aplicado', 'proveedor'])
  tipo_cambio?: string; // Enum: manual, bulk_update, markup_aplicado, proveedor
}

// bulk-update-precios.dto.ts
export class BulkUpdatePreciosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoPrecioUpdateDto)
  productos: ProductoPrecioUpdateDto[]; // Array de actualizaciones

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string; // Motivo general para todos (ej: "Actualización semestral")

  @IsOptional()
  @IsIn(['bulk_update', 'markup_aplicado', 'proveedor'])
  tipo_cambio?: string; // Tipo general
}

// producto-precio-update.dto.ts
export class ProductoPrecioUpdateDto {
  @IsString()
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_venta?: number;
}

// calculate-precio.dto.ts
export class CalculatePrecioDto {
  @IsNumber()
  @Min(0)
  costo: number; // Costo base

  @IsNumber()
  @Min(0)
  @Max(200)
  markup: number; // Markup en porcentaje (0-200)

  @IsNumber()
  @Min(0)
  @Max(100)
  iva_porcentaje: number; // IVA en porcentaje (21, 10.5, 0, etc.)

  @IsOptional()
  @IsBoolean()
  redondear?: boolean; // Redondear a centavos (default: true)
}

// precio-calculado-response.dto.ts
export class PrecioCalculadoResponseDto {
  costo: number; // Input
  markup: number; // Input
  iva_porcentaje: number; // Input
  precio_sin_iva: number; // costo + (costo * markup / 100)
  precio_final: number; // precio_sin_iva + (precio_sin_iva * iva / 100)
  precio_final_redondeado?: number; // Redondeado a centavos
  markup_aplicado: number; // Porcentaje real de ganancia
}

// historial-precio-response.dto.ts
export class HistorialPrecioResponseDto {
  id: string;
  producto_id: string;
  precio_anterior: number;
  costo_anterior: number;
  precio_nuevo: number;
  costo_nuevo: number;
  usuario_id?: string; // Quien hizo el cambio (nullable)
  motivo?: string; // Motivo del cambio (nullable)
  tipo_cambio: string; // manual, bulk_update, markup_aplicado, proveedor
  porcentaje_variacion: number; // % de variación en precio
  fecha_cambio: Date;
}

// markup-sugerido-response.dto.ts
export class MarkupSugeridoResponseDto {
  rubro_id: string;
  rubro_nombre: string;
  default_markup: number; // Markup por defecto del rubro
  costo_promedio: number; // Costo promedio de productos en rubro
  precio_promedio: number; // Precio promedio de productos en rubro
  markup_actual: number; // Markup promedio real aplicado
  markup_sugerido: number; // CALCULAR, NO APLICAR
  cantidad_productos: number; // Total productos en rubro
}
```

### 1.3 Business Rules

#### Historial de Precios (Trigger Automático)
- **Trigger DB:** `trigger_registrar_cambio_precio` se dispara automáticamente al UPDATE de `productos.costo` o `productos.precio_venta`
- **Registro automático:** Guardar en `precios_historia` con valores anteriores y nuevos
- **Motivo nullable:** `motivo` es opcional (puede ser NULL)
- **Cálculo automático:** `porcentaje_variacion = ((precio_nuevo - precio_anterior) / precio_anterior) * 100`
- **Usuario tracking:** Si el cambio viene de API con JWT, capturar `usuario_id` (sino NULL)
- **tipo_cambio:** Enum: `manual`, `bulk_update`, `markup_aplicado`, `proveedor`

#### Bulk Update de Precios
- **Transacción atómica:** Todos los updates o ninguno (Prisma transaction)
- **Validación previa:** Verificar que todos los `producto_id` existan
- **Motivo global:** Aplicar mismo motivo a todos los registros de historial
- **tipo_cambio global:** Aplicar mismo tipo_cambio a todos
- **Rollback:** Si un update falla, revertir TODOS

#### Markup Sugerido (Cálculo, NO Aplicar)
- **Solo cálculo:** NO modificar precios, solo retornar valores sugeridos
- **Fórmula markup sugerido:**
  ```typescript
  markup_actual = ((precio_promedio - costo_promedio) / costo_promedio) * 100
  markup_sugerido = rubro.default_markup || markup_actual
  ```
- **Usar default_markup del rubro:** Si existe, sugerirlo; sino calcular promedio actual
- **Endpoint informativo:** El encargado decide si aplicar o no

#### Cálculo de Precios
- **Fórmula completa:**
  ```typescript
  precio_sin_iva = costo + (costo * markup / 100)
  precio_final = precio_sin_iva + (precio_sin_iva * iva_porcentaje / 100)
  ```
- **Redondeo opcional:** Redondear a 2 decimales (centavos)
- **Markup máximo:** Validar 0-200% (extremo, pero posible para casos especiales)
- **IVA flexible:** Soportar 0%, 10.5%, 21%, etc.

#### Validaciones Críticas
- **Costo >= 0:** No permitir costos negativos
- **Precio >= costo:** Advertir si precio < costo (no bloquear, pero loguear)
- **Historial automático:** NUNCA fallar si trigger falla → loguear error y continuar
- **Concurrencia:** Usar Prisma optimistic locking (versioning) para evitar race conditions

### 1.4 Repository Queries

```typescript
// pricing.repository.ts

// GET historial de un producto
async getHistorialByProducto(productoId: string, limit: number = 10) {
  return prisma.precios_historia.findMany({
    where: { producto_id: productoId },
    orderBy: { fecha_cambio: 'desc' },
    take: limit,
    include: {
      productos: {
        select: { codigo: true, detalle: true },
      },
    },
  });
}

// GET markup sugerido para un rubro
async getMarkupSugerido(rubroId: string) {
  // Raw query para calcular promedios
  const result = await prisma.$queryRaw<any[]>`
    SELECT 
      r.id AS rubro_id,
      r.nombre AS rubro_nombre,
      r.default_markup,
      AVG(p.costo) FILTER (WHERE p.costo > 0 AND p.activo = true) AS costo_promedio,
      AVG(p.precio_venta) FILTER (WHERE p.precio_venta > 0 AND p.activo = true) AS precio_promedio,
      COUNT(p.id) FILTER (WHERE p.activo = true) AS cantidad_productos
    FROM rubros r
    LEFT JOIN productos p ON p.rubro_id = r.id
    WHERE r.id = ${rubroId}::uuid
    GROUP BY r.id, r.nombre, r.default_markup
  `;

  if (!result || result.length === 0) {
    throw new NotFoundException('Rubro no encontrado');
  }

  const data = result[0];

  // Calcular markup actual y sugerido
  const costoPromedio = parseFloat(data.costo_promedio) || 0;
  const precioPromedio = parseFloat(data.precio_promedio) || 0;
  const markupActual = costoPromedio > 0 
    ? ((precioPromedio - costoPromedio) / costoPromedio) * 100 
    : 0;

  return {
    rubro_id: data.rubro_id,
    rubro_nombre: data.rubro_nombre,
    default_markup: parseFloat(data.default_markup) || 0,
    costo_promedio: costoPromedio,
    precio_promedio: precioPromedio,
    markup_actual: markupActual,
    markup_sugerido: parseFloat(data.default_markup) || markupActual,
    cantidad_productos: parseInt(data.cantidad_productos) || 0,
  };
}

// PATCH update precio single
async updatePrecio(
  productoId: string, 
  dto: UpdatePrecioDto, 
  usuarioId?: string
) {
  // Obtener producto actual
  const producto = await prisma.productos.findUnique({
    where: { id: productoId },
  });
  if (!producto) throw new NotFoundException('Producto no encontrado');

  // Advertir si precio < costo
  if (dto.precio_venta && dto.costo && dto.precio_venta < dto.costo) {
    console.warn(
      `WARNING: Precio (${dto.precio_venta}) menor que costo (${dto.costo}) para producto ${productoId}`
    );
  }

  // Update en transaction (Prisma trigger se dispara automáticamente)
  const updated = await prisma.productos.update({
    where: { id: productoId },
    data: {
      costo: dto.costo ?? producto.costo,
      precio_venta: dto.precio_venta ?? producto.precio_venta,
      updated_at: new Date(),
    },
  });

  // El trigger_registrar_cambio_precio se dispara automáticamente
  // NO necesitamos crear manualmente el registro en precios_historia
  // PERO podemos agregarlo como fallback si el trigger falla

  return updated;
}

// PATCH bulk update precios (transaction)
async bulkUpdatePrecios(
  dto: BulkUpdatePreciosDto, 
  usuarioId?: string
) {
  // Validar que todos los productos existan
  const productosIds = dto.productos.map(p => p.producto_id);
  const existentes = await prisma.productos.findMany({
    where: { id: { in: productosIds } },
    select: { id: true, costo: true, precio_venta: true },
  });

  if (existentes.length !== productosIds.length) {
    throw new NotFoundException(
      `${productosIds.length - existentes.length} productos no encontrados`
    );
  }

  // Map para acceso rápido
  const productosMap = new Map(existentes.map(p => [p.id, p]));

  // Transaction para update bulk
  return await prisma.$transaction(async (tx) => {
    const updates = [];

    for (const item of dto.productos) {
      const productoActual = productosMap.get(item.producto_id)!;

      // Advertir si precio < costo
      if (item.precio_venta && item.costo && item.precio_venta < item.costo) {
        console.warn(
          `WARNING: Precio (${item.precio_venta}) menor que costo (${item.costo}) para producto ${item.producto_id}`
        );
      }

      const updated = await tx.productos.update({
        where: { id: item.producto_id },
        data: {
          costo: item.costo ?? productoActual.costo,
          precio_venta: item.precio_venta ?? productoActual.precio_venta,
          updated_at: new Date(),
        },
      });

      updates.push(updated);
    }

    // El trigger se dispara para cada update automáticamente
    return updates;
  });
}

// POST calculate precio (sin guardar)
calculatePrecio(dto: CalculatePrecioDto): PrecioCalculadoResponseDto {
  const { costo, markup, iva_porcentaje, redondear = true } = dto;

  // Cálculo paso a paso
  const precioSinIva = costo + (costo * markup / 100);
  const precioFinal = precioSinIva + (precioSinIva * iva_porcentaje / 100);

  // Redondear a 2 decimales
  const precioFinalRedondeado = redondear 
    ? Math.round(precioFinal * 100) / 100 
    : precioFinal;

  // Markup aplicado real (reverse calculation)
  const markupAplicado = costo > 0 
    ? ((precioFinal - costo) / costo) * 100 
    : 0;

  return {
    costo,
    markup,
    iva_porcentaje,
    precio_sin_iva: Math.round(precioSinIva * 100) / 100,
    precio_final: Math.round(precioFinal * 100) / 100,
    precio_final_redondeado: precioFinalRedondeado,
    markup_aplicado: Math.round(markupAplicado * 100) / 100,
  };
}
```

### 1.5 Critical Tests

```typescript
describe('PricingService', () => {
  // ✅ POST calculate precio - fórmula correcta
  it('should calculate precio_final with markup and IVA', () => {
    // Given: costo=100, markup=30%, iva=21%
    // When: calculatePrecio({ costo: 100, markup: 30, iva_porcentaje: 21 })
    // Then:
    //   precio_sin_iva = 100 + 30 = 130
    //   precio_final = 130 + (130 * 0.21) = 157.30
  });

  // ✅ POST calculate precio - redondeo
  it('should round precio_final to 2 decimals', () => {
    // Given: costo=99.99, markup=33.33, iva=21
    // When: calculatePrecio({ costo: 99.99, markup: 33.33, iva_porcentaje: 21, redondear: true })
    // Then: precio_final_redondeado should be rounded (no .9999)
  });

  // ✅ PATCH update precio - trigger historial automático
  it('should trigger precios_historia on precio update', async () => {
    // Given: producto exists with precio_venta=100
    // When: updatePrecio(id, { precio_venta: 120 })
    // Then:
    //   - producto.precio_venta = 120
    //   - precios_historia created with precio_anterior=100, precio_nuevo=120
  });

  // ✅ PATCH bulk update - transaction rollback
  it('should rollback all updates if one fails', async () => {
    // Given: productos [A, B, C] exist
    // When: bulkUpdatePrecios([A, B, INVALID_ID])
    // Then:
    //   - throw NotFoundException
    //   - A, B precios NOT updated (rollback)
  });

  // ✅ PATCH update precio - advertir precio < costo
  it('should warn if precio_venta < costo', async () => {
    // Given: producto exists
    // When: updatePrecio(id, { costo: 100, precio_venta: 80 })
    // Then:
    //   - console.warn logged
    //   - update succeeds (no bloquear)
  });

  // ✅ GET markup sugerido - cálculo correcto
  it('should calculate markup_sugerido from rubro default_markup', async () => {
    // Given: rubro "Lácteos" with default_markup=35
    //        productos: [costo=100, precio=140], [costo=200, precio=260]
    // When: getMarkupSugerido(lacteos.id)
    // Then:
    //   - costo_promedio = 150
    //   - precio_promedio = 200
    //   - markup_actual = ((200-150)/150)*100 = 33.33%
    //   - markup_sugerido = 35 (usa default_markup)
  });

  // ✅ GET historial - orden descendente
  it('should return historial ordered by fecha_cambio DESC', async () => {
    // Given: producto has 5 changes in precios_historia
    // When: getHistorialByProducto(id, limit=3)
    // Then: returns 3 most recent changes, newest first
  });
});
```

### 1.6 Guards

```typescript
// pricing.controller.ts
@Controller('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  @Get('history/:producto_id')
  @Roles('cajero', 'encargado', 'admin')
  getHistorial(
    @Param('producto_id') productoId: string,
    @Query('limit') limit: number = 10
  ) { }

  @Get('markup/:rubro_id')
  @Roles('encargado', 'admin')
  getMarkupSugerido(@Param('rubro_id') rubroId: string) { }

  @Patch('update/:producto_id')
  @Roles('encargado', 'admin')
  updatePrecio(
    @Param('producto_id') productoId: string,
    @Body() dto: UpdatePrecioDto,
    @CurrentUser() user: any
  ) { }

  @Patch('bulk-update')
  @Roles('encargado', 'admin')
  bulkUpdatePrecios(
    @Body() dto: BulkUpdatePreciosDto,
    @CurrentUser() user: any
  ) { }

  @Post('calculate')
  @Roles('encargado', 'admin')
  calculatePrecio(@Body() dto: CalculatePrecioDto) { }
}
```

---

## 2. PROMOCIONESMODULE

### 2.1 API Contracts

```typescript
// GET /promociones?activo=true&vigente=true
// GET /promociones/:id
// GET /promociones/:id/productos (productos en promoción)
// GET /promociones/vigentes/:producto_id (promociones aplicables a producto)
// POST /promociones
// PATCH /promociones/:id
// DELETE /promociones/:id (soft delete)
// POST /promociones/apply (aplicar promociones a carrito mock - testing)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 2.2 Key DTOs

```typescript
// create-promocion.dto.ts
export class CreatePromocionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nombre: string; // "2x1 en Gaseosas"

  @IsOptional()
  @IsString()
  descripcion?: string; // Descripción larga

  @IsIn(['porcentaje', 'monto_fijo', 'nxm', 'precio_especial'])
  tipo: string; // Enum: porcentaje, monto_fijo, nxm, precio_especial

  // --- Valores según tipo ---
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  valor_descuento?: number; // Para tipo "porcentaje" (0-100%)

  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_descuento_monto?: number; // Para tipo "monto_fijo" (ej: $50 descuento)

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad_requerida?: number; // Para tipo "nxm" (ej: 2x1 → 2)

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad_bonificada?: number; // Para tipo "nxm" (ej: 2x1 → 1)

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_especial?: number; // Para tipo "precio_especial" (ej: $99.99)

  // --- Vigencia ---
  @IsDateString()
  fecha_inicio: string; // YYYY-MM-DD

  @IsDateString()
  fecha_fin: string; // YYYY-MM-DD

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  dias_semana?: number[]; // [0,1,2,3,4,5,6] domingo=0, lunes=1, etc.

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/)
  hora_inicio?: string; // "09:00:00"

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/)
  hora_fin?: string; // "18:00:00"

  // --- Restricciones ---
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad_maxima_cliente?: number; // Límite por cliente por día

  @IsOptional()
  @IsBoolean()
  acumulable?: boolean; // Puede acumularse con otras promociones (default: false)

  @IsOptional()
  @IsInt()
  @Min(0)
  prioridad?: number; // Mayor número = mayor prioridad (default: 0)

  // --- Productos asociados ---
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  productos_ids: string[]; // Array de IDs de productos
}

// update-promocion.dto.ts
export class UpdatePromocionDto extends PartialType(CreatePromocionDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  productos_ids?: string[]; // Actualizar productos asociados
}

// query-promocion.dto.ts
export class QueryPromocionDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  vigente?: boolean; // Filtrar solo vigentes (fecha + hora + día semana)

  @IsOptional()
  @IsIn(['porcentaje', 'monto_fijo', 'nxm', 'precio_especial'])
  tipo?: string;
}

// apply-promociones.dto.ts (para testing)
export class ApplyPromocionesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarritoItemDto)
  items: CarritoItemDto[]; // Carrito mock

  @IsOptional()
  @IsDateString()
  fecha?: string; // Fecha simulada (default: now)

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana?: number; // Día simulado (default: hoy)

  @IsOptional()
  @IsString()
  hora?: string; // Hora simulada (default: now)
}

// carrito-item.dto.ts
export class CarritoItemDto {
  @IsString()
  @IsUUID()
  producto_id: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precio_unitario: number; // Precio normal (sin descuento)
}

// promociones-aplicadas-response.dto.ts
export class PromocionesAplicadasResponseDto {
  items_con_descuento: ItemConDescuentoDto[]; // Items con descuentos aplicados
  total_sin_descuento: number;
  total_descuentos: number;
  total_final: number;
  promociones_aplicadas: PromocionAplicadaDto[]; // Detalle de promociones
}

// item-con-descuento.dto.ts
export class ItemConDescuentoDto {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_sin_descuento: number;
  descuento: number; // Total descuento aplicado al item
  subtotal_final: number;
  promocion_id?: string; // ID de la promoción aplicada (si hay)
}

// promocion-aplicada.dto.ts
export class PromocionAplicadaDto {
  promocion_id: string;
  nombre: string;
  tipo: string;
  descuento_total: number; // Total descuento de esta promoción
  items_afectados: string[]; // IDs de productos afectados
}
```

### 2.3 Business Rules

#### Tipos de Promociones

**1. Porcentaje:**
- `valor_descuento`: 0-100 (porcentaje de descuento)
- Ejemplo: 20% descuento → `valor_descuento = 20`
- Cálculo: `descuento = precio_unitario * cantidad * (valor_descuento / 100)`

**2. Monto Fijo:**
- `valor_descuento`: Monto fijo de descuento (ej: $50)
- Ejemplo: $50 descuento → `valor_descuento = 50`
- Cálculo: `descuento = valor_descuento` (por unidad o por total según lógica)

**3. NxM (ej: 2x1, 3x2):**
- `cantidad_requerida`: Cantidad que se paga (ej: 2)
- `cantidad_bonificada`: Cantidad gratis (ej: 1)
- Ejemplo: 2x1 → `cantidad_requerida=2, cantidad_bonificada=1`
- Cálculo:
  ```typescript
  // Si cantidad >= cantidad_requerida + cantidad_bonificada
  const grupos = Math.floor(cantidad / (cantidad_requerida + cantidad_bonificada));
  descuento = grupos * cantidad_bonificada * precio_unitario;
  ```

**4. Precio Especial:**
- `precio_especial`: Precio fijo (ej: $99.99)
- Ejemplo: Producto a $150 con precio especial $99.99
- Cálculo: `descuento = (precio_unitario - precio_especial) * cantidad`

#### Vigencia (Criterios de aplicabilidad)

**Fecha:**
- `fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE`

**Hora (opcional):**
- Si `hora_inicio` y `hora_fin` están definidos:
  ```sql
  CURRENT_TIME >= hora_inicio AND CURRENT_TIME <= hora_fin
  ```
- Si NULL → válido todo el día

**Días de la Semana (opcional):**
- `dias_semana` es array de ints: [0,1,2,3,4,5,6] (domingo=0)
- Si definido: `EXTRACT(DOW FROM CURRENT_DATE) = ANY(dias_semana)`
- Si NULL o empty → válido todos los días

**Combinación:**
- Promoción es **vigente** si cumple: fecha AND hora AND día_semana

#### Prioridad y Acumulabilidad

**Prioridad:**
- Mayor número = mayor prioridad
- Default: 0
- Orden de aplicación: ORDER BY prioridad DESC
- Si dos promociones tienen misma prioridad, aplicar ambas (si son acumulables)

**Acumulabilidad:**
- `acumulable = true`: Puede combinarse con otras promociones
- `acumulable = false`: Exclusiva (no se aplica con otras)
- Lógica:
  1. Ordenar promociones por prioridad DESC
  2. Aplicar primera promoción (mayor prioridad)
  3. Si `acumulable=true`, continuar con siguiente
  4. Si `acumulable=false`, STOP (no aplicar más)

**Restricciones:**
- `cantidad_maxima_cliente`: Límite de usos por cliente por día (futuro - no implementar aún)
- Por ahora: sin límite

### 2.4 Repository Queries

```typescript
// promociones.repository.ts

// GET all con filtros
async findAll(query: QueryPromocionDto) {
  const where: any = { activo: query.activo ?? true };

  if (query.tipo) {
    where.tipo = query.tipo;
  }

  // Filtrar vigentes (fecha + hora + día semana)
  if (query.vigente) {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const currentDayOfWeek = now.getDay(); // 0-6 (domingo=0)

    where.fecha_inicio = { lte: new Date(currentDate) };
    where.fecha_fin = { gte: new Date(currentDate) };

    // Hora (si definida)
    where.OR = [
      { hora_inicio: null }, // No tiene restricción de hora
      {
        AND: [
          { hora_inicio: { lte: new Date(`1970-01-01T${currentTime}`) } },
          { hora_fin: { gte: new Date(`1970-01-01T${currentTime}`) } },
        ],
      },
    ];

    // Día semana (si definido)
    // Prisma no soporta directamente array contains, usar raw query
  }

  return prisma.promociones.findMany({
    where,
    include: {
      promociones_productos: {
        include: { productos: { select: { codigo: true, detalle: true } } },
      },
    },
    orderBy: [{ prioridad: 'desc' }, { created_at: 'desc' }],
  });
}

// GET by ID
async findById(id: string) {
  const promocion = await prisma.promociones.findUnique({
    where: { id },
    include: {
      promociones_productos: {
        include: {
          productos: {
            select: {
              id: true,
              codigo: true,
              detalle: true,
              precio_venta: true,
            },
          },
        },
      },
    },
  });
  if (!promocion) throw new NotFoundException('Promoción no encontrada');
  return promocion;
}

// GET promociones vigentes para un producto
async getPromocionesVigentesParaProducto(productoId: string) {
  // Raw query para filtrar por fecha + hora + día semana
  return await prisma.$queryRaw<any[]>`
    SELECT 
      p.id,
      p.nombre,
      p.tipo,
      p.valor_descuento,
      p.cantidad_requerida,
      p.cantidad_bonificada,
      p.precio_especial,
      p.prioridad,
      p.acumulable
    FROM promociones p
    INNER JOIN promociones_productos pp ON pp.promocion_id = p.id
    WHERE pp.producto_id = ${productoId}::uuid
      AND p.activo = true
      AND p.fecha_inicio <= CURRENT_DATE
      AND p.fecha_fin >= CURRENT_DATE
      AND (
        p.hora_inicio IS NULL 
        OR (CURRENT_TIME >= p.hora_inicio AND CURRENT_TIME <= p.hora_fin)
      )
      AND (
        p.dias_semana IS NULL 
        OR EXTRACT(DOW FROM CURRENT_DATE) = ANY(p.dias_semana)
      )
    ORDER BY p.prioridad DESC, p.created_at DESC
  `;
}

// POST create
async create(dto: CreatePromocionDto) {
  // Validar productos existen
  const productos = await prisma.productos.findMany({
    where: { id: { in: dto.productos_ids } },
    select: { id: true },
  });

  if (productos.length !== dto.productos_ids.length) {
    throw new NotFoundException(
      `${dto.productos_ids.length - productos.length} productos no encontrados`
    );
  }

  // Validar campos según tipo
  this.validatePromocionFields(dto);

  // Transaction: crear promocion + asociaciones
  return await prisma.$transaction(async (tx) => {
    const promocion = await tx.promociones.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        valor_descuento: dto.valor_descuento,
        cantidad_requerida: dto.cantidad_requerida,
        cantidad_bonificada: dto.cantidad_bonificada,
        precio_especial: dto.precio_especial,
        fecha_inicio: new Date(dto.fecha_inicio),
        fecha_fin: new Date(dto.fecha_fin),
        dias_semana: dto.dias_semana || [],
        hora_inicio: dto.hora_inicio 
          ? new Date(`1970-01-01T${dto.hora_inicio}`) 
          : null,
        hora_fin: dto.hora_fin 
          ? new Date(`1970-01-01T${dto.hora_fin}`) 
          : null,
        cantidad_maxima_cliente: dto.cantidad_maxima_cliente,
        acumulable: dto.acumulable ?? false,
        prioridad: dto.prioridad ?? 0,
      },
    });

    // Crear asociaciones productos
    const asociaciones = dto.productos_ids.map(producto_id => ({
      promocion_id: promocion.id,
      producto_id,
    }));

    await tx.promociones_productos.createMany({
      data: asociaciones,
    });

    return promocion;
  });
}

// PATCH update
async update(id: string, dto: UpdatePromocionDto) {
  const promocion = await this.findById(id);

  // Validar campos según tipo si cambia
  if (dto.tipo) {
    this.validatePromocionFields(dto as CreatePromocionDto);
  }

  // Transaction: update + actualizar productos si cambia
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.promociones.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        valor_descuento: dto.valor_descuento,
        cantidad_requerida: dto.cantidad_requerida,
        cantidad_bonificada: dto.cantidad_bonificada,
        precio_especial: dto.precio_especial,
        fecha_inicio: dto.fecha_inicio 
          ? new Date(dto.fecha_inicio) 
          : undefined,
        fecha_fin: dto.fecha_fin 
          ? new Date(dto.fecha_fin) 
          : undefined,
        dias_semana: dto.dias_semana,
        hora_inicio: dto.hora_inicio 
          ? new Date(`1970-01-01T${dto.hora_inicio}`) 
          : undefined,
        hora_fin: dto.hora_fin 
          ? new Date(`1970-01-01T${dto.hora_fin}`) 
          : undefined,
        cantidad_maxima_cliente: dto.cantidad_maxima_cliente,
        acumulable: dto.acumulable,
        prioridad: dto.prioridad,
        activo: dto.activo,
      },
    });

    // Si cambia productos_ids, eliminar y recrear asociaciones
    if (dto.productos_ids) {
      await tx.promociones_productos.deleteMany({
        where: { promocion_id: id },
      });

      const asociaciones = dto.productos_ids.map(producto_id => ({
        promocion_id: id,
        producto_id,
      }));

      await tx.promociones_productos.createMany({
        data: asociaciones,
      });
    }

    return updated;
  });
}

// DELETE soft delete
async softDelete(id: string) {
  await this.findById(id);

  return prisma.promociones.update({
    where: { id },
    data: { activo: false },
  });
}

// Helper: validar campos según tipo
private validatePromocionFields(dto: CreatePromocionDto | UpdatePromocionDto) {
  if (!dto.tipo) return; // Skip si no hay tipo

  switch (dto.tipo) {
    case 'porcentaje':
      if (dto.valor_descuento == null || dto.valor_descuento < 0 || dto.valor_descuento > 100) {
        throw new BadRequestException('valor_descuento debe estar entre 0 y 100 para tipo porcentaje');
      }
      break;

    case 'monto_fijo':
      if (dto.valor_descuento == null || dto.valor_descuento <= 0) {
        throw new BadRequestException('valor_descuento debe ser > 0 para tipo monto_fijo');
      }
      break;

    case 'nxm':
      if (!dto.cantidad_requerida || !dto.cantidad_bonificada) {
        throw new BadRequestException('cantidad_requerida y cantidad_bonificada son obligatorios para tipo nxm');
      }
      if (dto.cantidad_requerida < 1 || dto.cantidad_bonificada < 1) {
        throw new BadRequestException('cantidad_requerida y cantidad_bonificada deben ser >= 1');
      }
      break;

    case 'precio_especial':
      if (dto.precio_especial == null || dto.precio_especial <= 0) {
        throw new BadRequestException('precio_especial debe ser > 0 para tipo precio_especial');
      }
      break;

    default:
      throw new BadRequestException(`Tipo inválido: ${dto.tipo}`);
  }
}
```

### 2.5 Auto-Apply Logic (PromocionCalculatorService)

```typescript
// promocion-calculator.service.ts

@Injectable()
export class PromocionCalculatorService {
  constructor(
    private readonly promocionesRepository: PromocionesRepository,
  ) {}

  /**
   * Aplicar promociones a un carrito
   * Lógica: prioridad DESC, acumulabilidad
   */
  async aplicarPromociones(
    carrito: CarritoItemDto[],
    fecha?: Date,
    dia_semana?: number,
    hora?: string,
  ): Promise<PromocionesAplicadasResponseDto> {
    // Obtener todas las promociones vigentes para los productos del carrito
    const productosIds = carrito.map(item => item.producto_id);
    const promocionesVigentes = await this.getPromocionesVigentesParaProductos(
      productosIds,
      fecha,
      dia_semana,
      hora,
    );

    // Agrupar promociones por producto
    const promocionesPorProducto = this.agruparPorProducto(promocionesVigentes);

    // Inicializar resultados
    const itemsConDescuento: ItemConDescuentoDto[] = [];
    const promocionesAplicadas: Map<string, PromocionAplicadaDto> = new Map();
    let totalDescuentos = 0;

    // Procesar cada item del carrito
    for (const item of carrito) {
      const promocionesDelProducto = promocionesPorProducto.get(item.producto_id) || [];

      if (promocionesDelProducto.length === 0) {
        // Sin promoción
        itemsConDescuento.push({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal_sin_descuento: item.precio_unitario * item.cantidad,
          descuento: 0,
          subtotal_final: item.precio_unitario * item.cantidad,
        });
        continue;
      }

      // Aplicar promociones con lógica de prioridad y acumulabilidad
      const resultado = this.aplicarPromocionesAItem(
        item,
        promocionesDelProducto,
      );

      itemsConDescuento.push(resultado.item);
      totalDescuentos += resultado.item.descuento;

      // Registrar promociones aplicadas
      for (const aplicada of resultado.promociones_aplicadas) {
        if (promocionesAplicadas.has(aplicada.promocion_id)) {
          const existing = promocionesAplicadas.get(aplicada.promocion_id)!;
          existing.descuento_total += aplicada.descuento_total;
          existing.items_afectados.push(item.producto_id);
        } else {
          promocionesAplicadas.set(aplicada.promocion_id, {
            promocion_id: aplicada.promocion_id,
            nombre: aplicada.nombre,
            tipo: aplicada.tipo,
            descuento_total: aplicada.descuento_total,
            items_afectados: [item.producto_id],
          });
        }
      }
    }

    // Calcular totales
    const totalSinDescuento = itemsConDescuento.reduce(
      (sum, item) => sum + item.subtotal_sin_descuento,
      0,
    );
    const totalFinal = totalSinDescuento - totalDescuentos;

    return {
      items_con_descuento: itemsConDescuento,
      total_sin_descuento: totalSinDescuento,
      total_descuentos: totalDescuentos,
      total_final: totalFinal,
      promociones_aplicadas: Array.from(promocionesAplicadas.values()),
    };
  }

  /**
   * Aplicar promociones a un item específico
   * Respeta prioridad y acumulabilidad
   */
  private aplicarPromocionesAItem(
    item: CarritoItemDto,
    promociones: any[],
  ): {
    item: ItemConDescuentoDto;
    promociones_aplicadas: any[];
  } {
    // Ordenar por prioridad DESC
    const promocionesOrdenadas = promociones.sort(
      (a, b) => b.prioridad - a.prioridad,
    );

    let descuentoTotal = 0;
    const promocionesAplicadas: any[] = [];
    let promocionIdAplicada: string | undefined;

    for (const promocion of promocionesOrdenadas) {
      // Si ya hay una promoción NO acumulable aplicada, STOP
      if (promocionesAplicadas.length > 0 && !promocion.acumulable) {
        break;
      }

      // Calcular descuento según tipo
      const descuento = this.calcularDescuento(item, promocion);

      if (descuento > 0) {
        descuentoTotal += descuento;
        promocionIdAplicada = promocion.id;

        promocionesAplicadas.push({
          promocion_id: promocion.id,
          nombre: promocion.nombre,
          tipo: promocion.tipo,
          descuento_total: descuento,
        });

        // Si la promoción NO es acumulable, STOP
        if (!promocion.acumulable) {
          break;
        }
      }
    }

    return {
      item: {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal_sin_descuento: item.precio_unitario * item.cantidad,
        descuento: descuentoTotal,
        subtotal_final: item.precio_unitario * item.cantidad - descuentoTotal,
        promocion_id: promocionIdAplicada,
      },
      promociones_aplicadas: promocionesAplicadas,
    };
  }

  /**
   * Calcular descuento según tipo de promoción
   */
  private calcularDescuento(
    item: CarritoItemDto,
    promocion: any,
  ): number {
    const { cantidad, precio_unitario } = item;
    const subtotal = precio_unitario * cantidad;

    switch (promocion.tipo) {
      case 'porcentaje':
        return subtotal * (promocion.valor_descuento / 100);

      case 'monto_fijo':
        return Math.min(promocion.valor_descuento, subtotal); // No exceder subtotal

      case 'nxm': {
        const { cantidad_requerida, cantidad_bonificada } = promocion;
        const grupoCompleto = cantidad_requerida + cantidad_bonificada;

        if (cantidad < grupoCompleto) return 0; // No alcanza para la promo

        const grupos = Math.floor(cantidad / grupoCompleto);
        return grupos * cantidad_bonificada * precio_unitario;
      }

      case 'precio_especial': {
        const { precio_especial } = promocion;
        if (precio_unitario <= precio_especial) return 0; // Ya es más barato

        return (precio_unitario - precio_especial) * cantidad;
      }

      default:
        return 0;
    }
  }

  /**
   * Obtener promociones vigentes para múltiples productos
   */
  private async getPromocionesVigentesParaProductos(
    productosIds: string[],
    fecha?: Date,
    dia_semana?: number,
    hora?: string,
  ): Promise<any[]> {
    const now = fecha || new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = hora || now.toTimeString().split(' ')[0];
    const currentDayOfWeek = dia_semana ?? now.getDay();

    // Raw query para filtros complejos
    return await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.nombre,
        p.tipo,
        p.valor_descuento,
        p.cantidad_requerida,
        p.cantidad_bonificada,
        p.precio_especial,
        p.prioridad,
        p.acumulable,
        pp.producto_id
      FROM promociones p
      INNER JOIN promociones_productos pp ON pp.promocion_id = p.id
      WHERE pp.producto_id = ANY(${productosIds}::uuid[])
        AND p.activo = true
        AND p.fecha_inicio <= ${currentDate}::date
        AND p.fecha_fin >= ${currentDate}::date
        AND (
          p.hora_inicio IS NULL 
          OR (${currentTime}::time >= p.hora_inicio AND ${currentTime}::time <= p.hora_fin)
        )
        AND (
          p.dias_semana IS NULL 
          OR ARRAY_LENGTH(p.dias_semana, 1) = 0
          OR ${currentDayOfWeek}::int = ANY(p.dias_semana)
        )
      ORDER BY p.prioridad DESC, p.created_at DESC
    `;
  }

  /**
   * Agrupar promociones por producto_id
   */
  private agruparPorProducto(promociones: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();

    for (const promo of promociones) {
      const existing = map.get(promo.producto_id) || [];
      existing.push(promo);
      map.set(promo.producto_id, existing);
    }

    return map;
  }
}
```

### 2.6 Critical Tests

```typescript
describe('PromocionesService', () => {
  // ✅ POST create - validar campos según tipo
  it('should reject porcentaje with valor_descuento > 100', async () => {
    // When: create({ tipo: 'porcentaje', valor_descuento: 150 })
    // Then: throw BadRequestException
  });

  it('should reject nxm without cantidad_requerida', async () => {
    // When: create({ tipo: 'nxm', cantidad_bonificada: 1 })
    // Then: throw BadRequestException "cantidad_requerida es obligatorio"
  });

  // ✅ GET vigentes - filtrar por fecha
  it('should return only vigentes by fecha_inicio and fecha_fin', async () => {
    // Given: promociones [A (vigente), B (vencida), C (futura)]
    // When: findAll({ vigente: true })
    // Then: returns [A], length === 1
  });

  // ✅ GET vigentes - filtrar por hora
  it('should filter by hora_inicio and hora_fin', async () => {
    // Given: promocion with hora_inicio="09:00:00", hora_fin="18:00:00"
    // When: getPromocionesVigentesParaProducto(id) at 20:00
    // Then: returns [], no vigente
  });

  // ✅ GET vigentes - filtrar por día semana
  it('should filter by dias_semana', async () => {
    // Given: promocion with dias_semana=[1,2,3] (lunes a miércoles)
    // When: query on domingo (dia=0)
    // Then: returns [], no vigente
  });

  // ✅ Apply promociones - porcentaje
  it('should apply porcentaje discount correctly', async () => {
    // Given: item { precio_unitario: 100, cantidad: 2 }, promo 20%
    // When: aplicarPromociones([item])
    // Then:
    //   - subtotal_sin_descuento = 200
    //   - descuento = 40 (200 * 0.20)
    //   - subtotal_final = 160
  });

  // ✅ Apply promociones - nxm (2x1)
  it('should apply 2x1 discount for cantidad=3', async () => {
    // Given: item { precio_unitario: 100, cantidad: 3 }, promo 2x1
    // When: aplicarPromociones([item])
    // Then:
    //   - grupos = floor(3 / 3) = 1
    //   - descuento = 1 * 1 * 100 = 100
  });

  it('should NOT apply 2x1 for cantidad=2 (insuficiente)', async () => {
    // Given: item { precio_unitario: 100, cantidad: 2 }, promo 2x1
    // When: aplicarPromociones([item])
    // Then: descuento = 0 (no alcanza grupo completo)
  });

  // ✅ Apply promociones - prioridad
  it('should apply higher priority promo first', async () => {
    // Given: promos [A (prioridad=10, 20%), B (prioridad=5, 30%)]
    // When: aplicarPromociones([item])
    // Then: aplica A (mayor prioridad), descuento = 20%
  });

  // ✅ Apply promociones - acumulabilidad
  it('should accumulate multiple promos if acumulable=true', async () => {
    // Given: promos [A (prioridad=10, 10%, acumulable=true), B (prioridad=5, 15%, acumulable=true)]
    // When: aplicarPromociones([item precio=100, cantidad=1])
    // Then:
    //   - descuento = 10 + 15 = 25
    //   - subtotal_final = 75
  });

  it('should NOT accumulate if acumulable=false', async () => {
    // Given: promos [A (prioridad=10, 20%, acumulable=false), B (prioridad=5, 30%)]
    // When: aplicarPromociones([item])
    // Then: aplica solo A (acumulable=false), descuento = 20%
  });

  // ✅ Apply promociones - precio_especial
  it('should apply precio_especial discount', async () => {
    // Given: item { precio_unitario: 150, cantidad: 2 }, promo precio_especial=99.99
    // When: aplicarPromociones([item])
    // Then:
    //   - descuento = (150 - 99.99) * 2 = 100.02
    //   - subtotal_final = 300 - 100.02 = 199.98
  });

  // ✅ PATCH update - actualizar productos_ids
  it('should update asociaciones productos on productos_ids change', async () => {
    // Given: promocion exists with productos [A, B]
    // When: update(id, { productos_ids: [B, C] })
    // Then:
    //   - elimina A
    //   - mantiene B
    //   - agrega C
  });
});
```

### 2.7 Guards

```typescript
// promociones.controller.ts
@Controller('promociones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromocionesController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryPromocionDto) { }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findById(@Param('id') id: string) { }

  @Get(':id/productos')
  @Roles('cajero', 'encargado', 'admin')
  getProductosPromocion(@Param('id') id: string) { }

  @Get('vigentes/:producto_id')
  @Roles('cajero', 'encargado', 'admin')
  getPromocionesVigentes(@Param('producto_id') productoId: string) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreatePromocionDto) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdatePromocionDto) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  softDelete(@Param('id') id: string) { }

  @Post('apply')
  @Roles('cajero', 'encargado', 'admin')
  applyPromociones(@Body() dto: ApplyPromocionesDto) { }
}
```

---

## IMPLEMENTATION CHECKLIST

### PricingModule
- [ ] `pricing.module.ts` (imports, providers, exports)
- [ ] `pricing.controller.ts` (5 endpoints + guards)
- [ ] `pricing.service.ts` (business logic + cálculos)
- [ ] `pricing.repository.ts` (5 queries + 1 raw SQL)
- [ ] `dto/update-precio.dto.ts` (4 fields + validators)
- [ ] `dto/bulk-update-precios.dto.ts` (array + motivo + tipo)
- [ ] `dto/calculate-precio.dto.ts` (4 fields + fórmula)
- [ ] `dto/precio-calculado-response.dto.ts` (output)
- [ ] `dto/historial-precio-response.dto.ts` (output)
- [ ] `dto/markup-sugerido-response.dto.ts` (output)
- [ ] `__tests__/pricing.service.spec.ts` (7 tests)
- [ ] `__tests__/pricing.e2e-spec.ts` (5 endpoints)

### PromocionesModule
- [ ] `promociones.module.ts`
- [ ] `promociones.controller.ts` (8 endpoints + guards)
- [ ] `promociones.service.ts` (business logic + validaciones)
- [ ] `promociones.repository.ts` (7 queries + 1 raw SQL)
- [ ] `promocion-calculator.service.ts` (auto-apply logic)
- [ ] `dto/create-promocion.dto.ts` (18 fields + validators)
- [ ] `dto/update-promocion.dto.ts` (extends PartialType + activo)
- [ ] `dto/query-promocion.dto.ts` (3 filters)
- [ ] `dto/apply-promociones.dto.ts` (carrito mock)
- [ ] `dto/carrito-item.dto.ts` (3 fields)
- [ ] `dto/promociones-aplicadas-response.dto.ts` (output)
- [ ] `dto/item-con-descuento.dto.ts` (output)
- [ ] `dto/promocion-aplicada.dto.ts` (output)
- [ ] `__tests__/promociones.service.spec.ts` (11 tests)
- [ ] `__tests__/promocion-calculator.service.spec.ts` (6 tests)
- [ ] `__tests__/promociones.e2e-spec.ts` (8 endpoints)

---

## BUSINESS RULES SUMMARY

| Module | Key Rule | Validation |
|--------|----------|------------|
| **Pricing** | Historial automático | Trigger DB dispara on UPDATE productos.costo/precio_venta |
| | Motivo nullable | motivo es opcional en precios_historia |
| | Bulk update | Transaction atómica (all or nothing) |
| | Markup sugerido | CALCULAR, NO APLICAR (informativo) |
| | Precio < costo | Advertir (warn), NO bloquear |
| **Promociones** | Tipos | porcentaje, monto_fijo, nxm, precio_especial |
| | Vigencia fecha | fecha_inicio <= CURRENT_DATE <= fecha_fin |
| | Vigencia hora | hora_inicio <= CURRENT_TIME <= hora_fin (si definida) |
| | Vigencia día | EXTRACT(DOW) IN dias_semana (si definida) |
| | Prioridad | Ordenar por prioridad DESC, aplicar de mayor a menor |
| | Acumulabilidad | acumulable=true → continuar; false → STOP |
| | Auto-apply | Lógica en PromocionCalculatorService |

---

## CRITICAL QUERIES

### Pricing

```sql
-- Historial de un producto (últimos 10 cambios)
SELECT 
  ph.id,
  ph.precio_anterior,
  ph.precio_nuevo,
  ph.costo_anterior,
  ph.costo_nuevo,
  ph.motivo,
  ph.tipo_cambio,
  ph.porcentaje_variacion,
  ph.fecha_cambio,
  u.username AS usuario_cambio
FROM precios_historia ph
LEFT JOIN usuarios u ON u.id = ph.usuario_id
WHERE ph.producto_id = $1
ORDER BY ph.fecha_cambio DESC
LIMIT $2;

-- Markup sugerido para un rubro
SELECT 
  r.id AS rubro_id,
  r.nombre AS rubro_nombre,
  r.default_markup,
  AVG(p.costo) FILTER (WHERE p.costo > 0 AND p.activo = true) AS costo_promedio,
  AVG(p.precio_venta) FILTER (WHERE p.precio_venta > 0 AND p.activo = true) AS precio_promedio,
  COUNT(p.id) FILTER (WHERE p.activo = true) AS cantidad_productos
FROM rubros r
LEFT JOIN productos p ON p.rubro_id = r.id
WHERE r.id = $1
GROUP BY r.id, r.nombre, r.default_markup;
```

### Promociones

```sql
-- Promociones vigentes para un producto
SELECT 
  p.id,
  p.nombre,
  p.tipo,
  p.valor_descuento,
  p.cantidad_requerida,
  p.cantidad_bonificada,
  p.precio_especial,
  p.prioridad,
  p.acumulable
FROM promociones p
INNER JOIN promociones_productos pp ON pp.promocion_id = p.id
WHERE pp.producto_id = $1
  AND p.activo = true
  AND p.fecha_inicio <= CURRENT_DATE
  AND p.fecha_fin >= CURRENT_DATE
  AND (
    p.hora_inicio IS NULL 
    OR (CURRENT_TIME >= p.hora_inicio AND CURRENT_TIME <= p.hora_fin)
  )
  AND (
    p.dias_semana IS NULL 
    OR ARRAY_LENGTH(p.dias_semana, 1) = 0
    OR EXTRACT(DOW FROM CURRENT_DATE) = ANY(p.dias_semana)
  )
ORDER BY p.prioridad DESC, p.created_at DESC;

-- Productos de una promoción
SELECT 
  p.id,
  p.codigo,
  p.detalle,
  p.precio_venta
FROM productos p
INNER JOIN promociones_productos pp ON pp.producto_id = p.id
WHERE pp.promocion_id = $1
  AND p.activo = true
ORDER BY p.detalle ASC;
```

---

## INTEGRATION POINTS

### PricingModule → ProductsModule
- `updatePrecio()` actualiza `productos.costo` y `productos.precio_venta`
- Trigger `trigger_registrar_cambio_precio` registra en `precios_historia`
- `bulkUpdatePrecios()` actualiza múltiples productos en transaction

### PromocionesModule → SalesModule (futuro)
- `PromocionCalculatorService.aplicarPromociones()` será llamado desde SalesModule al crear venta
- Promociones auto-aplicadas se registran en `detalle_ventas.promocion_id`
- Descuentos calculados se suman en `ventas.descuentos`

### Event Flow (Precio Update)
```
PATCH /pricing/update/:id
  → pricing.service.updatePrecio()
  → prisma.productos.update({ costo, precio_venta })
  → TRIGGER trigger_registrar_cambio_precio
  → INSERT INTO precios_historia
  → Event: ProductoPrecioUpdatedEvent (optional)
```

### Event Flow (Promoción Apply)
```
POST /promociones/apply
  → promocion-calculator.service.aplicarPromociones()
  → getPromocionesVigentesParaProductos() (raw query)
  → aplicarPromocionesAItem() (lógica acumulabilidad)
  → calcularDescuento() (según tipo)
  → return PromocionesAplicadasResponseDto
```

---

## DATABASE SCHEMA VALIDATION

```prisma
// Verificar que estos campos existan en schema.prisma

// precios_historia
model precios_historia {
  id                   String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  producto_id          String    @db.Uuid
  precio_anterior      Decimal?  @db.Decimal(12, 2)
  costo_anterior       Decimal?  @db.Decimal(12, 2)
  precio_nuevo         Decimal?  @db.Decimal(12, 2)
  costo_nuevo          Decimal?  @db.Decimal(12, 2)
  usuario_id           String?   @db.Uuid
  motivo               String?   @db.VarChar(500) // NULLABLE
  tipo_cambio          String?   @db.VarChar(20)
  porcentaje_variacion Decimal?  @db.Decimal(8, 2)
  fecha_cambio         DateTime? @default(now()) @db.Timestamp(6)
  productos            productos @relation(fields: [producto_id], references: [id], onDelete: Cascade)

  @@index([producto_id])
  @@index([fecha_cambio(sort: Desc)])
}

// promociones
model promociones {
  id                      String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  nombre                  String    @db.VarChar(200)
  descripcion             String?
  tipo                    String    @db.VarChar(30) // porcentaje, monto_fijo, nxm, precio_especial
  valor_descuento         Decimal?  @db.Decimal(12, 2)
  cantidad_requerida      Int?
  cantidad_bonificada     Int?
  precio_especial         Decimal?  @db.Decimal(12, 2)
  fecha_inicio            DateTime  @db.Date
  fecha_fin               DateTime  @db.Date
  dias_semana             Int[]     // [0,1,2,3,4,5,6]
  hora_inicio             DateTime? @db.Time(6)
  hora_fin                DateTime? @db.Time(6)
  cantidad_maxima_cliente Int?
  acumulable              Boolean?  @default(false)
  activo                  Boolean?  @default(true)
  prioridad               Int?      @default(0)
  created_at              DateTime? @default(now()) @db.Timestamp(6)
  promociones_productos   promociones_productos[]
  detalle_ventas          detalle_ventas[]
}

// promociones_productos
model promociones_productos {
  id           String      @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  promocion_id String      @db.Uuid
  producto_id  String      @db.Uuid
  productos    productos   @relation(fields: [producto_id], references: [id], onDelete: Cascade)
  promociones  promociones @relation(fields: [promocion_id], references: [id], onDelete: Cascade)

  @@unique([promocion_id, producto_id])
  @@index([promocion_id])
  @@index([producto_id])
}
```

---

## END OF SPEC_03_PRICING_PROMOTIONS

**Next Steps:**
1. Review and approve this spec
2. Implement PricingModule first (depends on ProductsModule)
3. Implement PromocionesModule (depends on ProductsModule)
4. Test both modules independently
5. Integration test: update precio → verify historial
6. Integration test: apply promociones → verify descuentos
7. Continue with SPEC_04_SALES_OPERATIONS.md

**Total Lines:** ~900 lines  
**Total Modules:** 2  
**Total Endpoints:** 13  
**Total Tests:** 24 critical test cases

**Dependencies:**
- SharedModule (validators, exceptions, interceptors)
- AuthModule (JWT, roles)
- ProductsModule (productos table)
- Database triggers (trigger_registrar_cambio_precio)
