# SPEC_04_SALES_OPERATIONS - Backend Refactor
## SalesModule, DevolucionesModule, CajasModule, MovimientosCajaModule, CierresCajaModule

**Project:** management-software-byomnia  
**Phase:** SPEC (Specifications)  
**Modules:** 5 Sales & Operations Modules  
**Approach:** Clean Slate  
**Dependencies:** SharedModule, AuthModule, ProductsModule, InventoryModule  
**Coverage Requirement:** 90% (HIGHEST - CRITICAL BUSINESS LOGIC)

---

## TABLE OF CONTENTS

1. [SalesModule](#1-salesmodule)
   - API Contracts
   - DTOs
   - Business Rules (CRITICAL)
   - Repository Queries
   - Transaction Flow
   - Tests
   - Guards

2. [DevolucionesModule](#2-devolucionesmodule)
   - API Contracts
   - DTOs
   - Business Rules (Retorno mismo lote)
   - Repository Queries
   - Tests
   - Guards

3. [CajasModule](#3-cajasmodule)
   - API Contracts
   - DTOs
   - Business Rules
   - Repository Queries
   - Tests
   - Guards

4. [MovimientosCajaModule](#4-movimientoscajamodule)
   - API Contracts
   - DTOs
   - Business Rules
   - Repository Queries
   - Tests
   - Guards

5. [CierresCajaModule](#5-cierrescajamodule)
   - API Contracts
   - DTOs
   - Business Rules (Diferencia efectivo)
   - Repository Queries
   - Critical Calculations
   - Tests
   - Guards

---

## 1. SALESMODULE

### 1.1 API Contracts

```typescript
// POST /ventas (crear venta completa)
// GET /ventas?caja_id={uuid}&fecha_desde={date}&incluir_anuladas={bool}&page=1&limit=20
// GET /ventas/:id (detalle completo con items y medios de pago)
// GET /ventas/ticket/:numero (buscar por numero_ticket)
// GET /ventas/caja/:id (ventas del día de una caja)
// POST /ventas/:id/anular (anular venta existente)
```

**Roles:**
- `POST /ventas`: cajero, encargado, admin
- `GET`: cajero, encargado, admin
- `POST /ventas/:id/anular`: encargado, admin

### 1.2 Key DTOs

```typescript
// create-venta.dto.ts
export class CreateVentaDto {
  @IsUUID()
  caja_id: string;

  @IsOptional()
  @IsUUID()
  transaccion_id?: string; // Para split tickets - múltiples ventas 1 transacción

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketItemDto)
  items: TicketItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedioPagoDto)
  medios_pago: MedioPagoDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// ticket-item.dto.ts
export class TicketItemDto {
  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string; // Si producto maneja_lotes, se selecciona automático FEFO

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  precio_manual?: number; // REQUERIDO para productos F/V/P/C (requiere_precio_manual = true)

  @IsOptional()
  @IsUUID()
  promocion_id?: string; // Auto-aplicada por PromocionCalculatorService
}

// medio-pago.dto.ts
export class MedioPagoDto {
  @IsIn(['efectivo', 'debito', 'credito', 'transferencia', 'qr'])
  medio_pago: string;

  @IsNumber()
  @Min(0.01)
  monto: number;
}

// anular-venta.dto.ts
export class AnularVentaDto {
  @IsString()
  @MinLength(10)
  motivo_anulacion: string;
}

// filter-ventas.dto.ts
export class FilterVentasDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  caja_id?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsBoolean()
  incluir_anuladas?: boolean = false; // Default: NO mostrar anuladas
}

// venta-response.dto.ts
export class VentaResponseDto {
  venta: {
    id: string;
    numero_ticket: string;
    transaccion_id: string;
    caja_id: string;
    subtotal: number;
    descuentos: number;
    total: number;
    vuelto: number;
    fecha: Date;
  };
  items: DetalleVentaDto[];
  medios_pago: MedioPagoVentaDto[];
}
```

### 1.3 Business Rules (CRITICAL)

#### 1.3.1 Número de Ticket Único

- **Formato:** `CAJA{numero}-{YYYYMMDD}-{NNNN}`
- **Ejemplo:** `CAJA1-20260420-0001`, `CAJA2-20260420-0042`
- **Generación:** Secuencial por caja y día (resetea cada día)
- **Implementación:**

```typescript
async generarNumeroTicket(cajaId: string): Promise<string> {
  const caja = await this.cajasRepository.findById(cajaId);
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // Obtener último número del día para esta caja
  const ultimaVenta = await this.prisma.ventas.findFirst({
    where: {
      caja_id: cajaId,
      numero_ticket: { startsWith: `CAJA${caja.numero}-${hoy}` },
      anulada: false,
    },
    orderBy: { numero_ticket: 'desc' },
  });

  let secuencia = 1;
  if (ultimaVenta) {
    const parts = ultimaVenta.numero_ticket.split('-');
    secuencia = parseInt(parts[2]) + 1;
  }

  return `CAJA${caja.numero}-${hoy}-${secuencia.toString().padStart(4, '0')}`;
}
```

#### 1.3.2 Split Tickets (Múltiples Medios de Pago)

- **Escenario:** Cliente paga $5000: $3000 efectivo + $2000 débito
- **Implementación:** 
  - Crear **1 ticket único** con transaccion_id
  - Tabla `medios_pago_venta` tiene múltiples registros con mismo `venta_id`
  - NO crear múltiples ventas separadas

```typescript
// Ejemplo entrada
{
  "caja_id": "uuid-caja-1",
  "items": [...],
  "medios_pago": [
    { "medio_pago": "efectivo", "monto": 3000 },
    { "medio_pago": "debito", "monto": 2000 }
  ]
}

// Resultado en DB
ventas:
  id: uuid-venta-1
  numero_ticket: "CAJA1-20260420-0001"
  transaccion_id: uuid-transaccion-1
  total: 5000
  vuelto: 0

medios_pago_venta:
  { venta_id: uuid-venta-1, medio_pago: "efectivo", monto: 3000 }
  { venta_id: uuid-venta-1, medio_pago: "debito", monto: 2000 }
```

#### 1.3.3 Precio Manual (Productos F/V/P/C)

- **Validación:** Si `producto.requiere_precio_manual = true`, entonces `precio_manual` es REQUERIDO
- **Rango:** 0.01 <= precio_manual <= 999999
- **Productos especiales:** F (Fiambre), V (Verdulería), P (Panadería), C (Carnicería)

```typescript
async validatePrecioManual(items: TicketItemDto[]): Promise<void> {
  for (const item of items) {
    const producto = await this.productosRepository.findById(item.producto_id);
    
    if (producto.requiere_precio_manual && !item.precio_manual) {
      throw new BusinessRuleException(
        `Producto "${producto.detalle}" requiere precio manual`
      );
    }

    if (item.precio_manual && (item.precio_manual < 0.01 || item.precio_manual > 999999)) {
      throw new BusinessRuleException(
        `Precio manual debe estar entre $0.01 y $999999`
      );
    }
  }
}
```

#### 1.3.4 FEFO Integration (First Expired First Out)

- **Lógica:** Si producto `maneja_lotes = true`, seleccionar automáticamente lote más próximo a vencer
- **Proceso:**
  1. Validar stock disponible (suma de todos los lotes)
  2. Seleccionar lotes por FEFO (fecha_vencimiento ASC)
  3. Si cantidad requiere múltiples lotes, crear múltiples `detalle_ventas`

```typescript
async selectLotesFEFO(productoId: string, cantidadRequerida: number): Promise<LoteSelection[]> {
  const lotesDisponibles = await this.prisma.lotes.findMany({
    where: {
      producto_id: productoId,
      fecha_vencimiento: { gte: new Date() }, // No vencidos
      stock_disponible: { gt: 0 },
    },
    orderBy: { fecha_vencimiento: 'asc' }, // FEFO
  });

  const loteSelections: LoteSelection[] = [];
  let cantidadRestante = cantidadRequerida;

  for (const lote of lotesDisponibles) {
    if (cantidadRestante <= 0) break;

    const cantidadDeLote = Math.min(cantidadRestante, lote.stock_disponible);
    loteSelections.push({
      lote_id: lote.id,
      cantidad: cantidadDeLote,
    });
    cantidadRestante -= cantidadDeLote;
  }

  if (cantidadRestante > 0) {
    throw new BusinessRuleException(
      `Stock insuficiente: faltan ${cantidadRestante} unidades`
    );
  }

  return loteSelections;
}
```

#### 1.3.5 Validación Suma Medios de Pago

- **Regla:** `SUM(medios_pago.monto) >= venta.total`
- **Vuelto:** Solo para efectivo. `vuelto = SUM(efectivo) - total`

```typescript
async validateMediosPago(total: number, mediosPago: MedioPagoDto[]): Promise<number> {
  const sumaPagos = mediosPago.reduce((sum, mp) => sum + mp.monto, 0);

  if (sumaPagos < total) {
    throw new BusinessRuleException(
      `Pago insuficiente: recibido $${sumaPagos}, requerido $${total}`
    );
  }

  // Calcular vuelto (solo efectivo)
  const totalEfectivo = mediosPago
    .filter(mp => mp.medio_pago === 'efectivo')
    .reduce((sum, mp) => sum + mp.monto, 0);

  return Math.max(0, totalEfectivo - total);
}
```

### 1.4 Repository Queries

```typescript
// sales.repository.ts

// GET all (con filtros y paginación)
async findAll(filters: FilterVentasDto): Promise<{ data: Venta[]; total: number }> {
  const where: Prisma.VentasWhereInput = {
    anulada: filters.incluir_anuladas ? undefined : false,
    caja_id: filters.caja_id,
    fecha: {
      gte: filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
      lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.ventas.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { fecha: 'desc' },
      include: {
        cajas: { select: { numero: true, nombre: true } },
        usuarios: { select: { username: true } },
        _count: { select: { detalle_ventas: true, medios_pago_venta: true } },
      },
    }),
    prisma.ventas.count({ where }),
  ]);

  return { data, total };
}

// GET by ID (detalle completo)
async findById(id: string): Promise<Venta | null> {
  return prisma.ventas.findUnique({
    where: { id },
    include: {
      detalle_ventas: {
        include: {
          productos: { select: { codigo: true, detalle: true } },
          lotes: { select: { numero_lote: true } },
          promociones: { select: { nombre: true } },
        },
      },
      medios_pago_venta: true,
      cajas: { select: { numero: true, nombre: true } },
      usuarios: { select: { username: true } },
    },
  });
}

// GET by numero_ticket
async findByNumeroTicket(numeroTicket: string): Promise<Venta | null> {
  return this.findById(
    (await prisma.ventas.findFirst({ 
      where: { numero_ticket: numeroTicket },
      select: { id: true } 
    }))?.id
  );
}

// GET ventas de una caja (hoy)
async findByCajaHoy(cajaId: string): Promise<Venta[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  return prisma.ventas.findMany({
    where: {
      caja_id: cajaId,
      fecha: { gte: hoy, lt: manana },
      anulada: false,
    },
    orderBy: { fecha: 'desc' },
    include: {
      detalle_ventas: true,
      medios_pago_venta: true,
    },
  });
}

// POST create venta (TRANSACTION)
async create(data: CreateVentaData, tx: PrismaTransaction): Promise<Venta> {
  return tx.ventas.create({
    data: {
      numero_ticket: data.numero_ticket,
      transaccion_id: data.transaccion_id || uuidv4(),
      caja_id: data.caja_id,
      subtotal: data.subtotal,
      descuentos: data.descuentos,
      total: data.total,
      vuelto: data.vuelto,
      usuario_id: data.usuario_id,
      observaciones: data.observaciones,
    },
  });
}

// POST anular venta
async anular(id: string, motivo: string, userId: string): Promise<void> {
  const venta = await this.findById(id);
  if (!venta) throw new NotFoundException('Venta no encontrada');
  if (venta.anulada) throw new BusinessRuleException('Venta ya anulada');

  await prisma.ventas.update({
    where: { id },
    data: {
      anulada: true,
      motivo_anulacion: motivo,
      fecha_anulacion: new Date(),
    },
  });
}
```

### 1.5 Transaction Flow (CRITICAL)

```typescript
// sales.service.ts

async createVenta(dto: CreateVentaDto, userId: string): Promise<VentaResponseDto> {
  return this.prisma.$transaction(async (tx) => {
    // STEP 1: Validar precio manual para productos especiales
    await this.validatePrecioManual(dto.items);

    // STEP 2: Procesar items con FEFO (si aplica)
    const itemsProcesados = await this.procesarItems(dto.items);

    // STEP 3: Validar stock disponible
    await this.validateStock(itemsProcesados, tx);

    // STEP 4: Aplicar promociones automáticas
    const itemsConDescuentos = await this.promocionCalculatorService.aplicarPromociones(
      itemsProcesados
    );

    // STEP 5: Calcular totales
    const totales = await this.ventaCalculatorService.calcularTotales(itemsConDescuentos);

    // STEP 6: Validar suma medios de pago >= total
    const vuelto = await this.validateMediosPago(totales.total, dto.medios_pago);

    // STEP 7: Generar número de ticket
    const numeroTicket = await this.generarNumeroTicket(dto.caja_id);

    // STEP 8: Crear venta (cabecera)
    const venta = await tx.ventas.create({
      data: {
        numero_ticket: numeroTicket,
        transaccion_id: dto.transaccion_id || uuidv4(),
        caja_id: dto.caja_id,
        subtotal: totales.subtotal,
        descuentos: totales.descuentos,
        total: totales.total,
        vuelto,
        usuario_id: userId,
        observaciones: dto.observaciones,
      },
    });

    // STEP 9: Crear detalle_ventas (bulk)
    await tx.detalle_ventas.createMany({
      data: itemsConDescuentos.map(item => ({
        venta_id: venta.id,
        producto_id: item.producto_id,
        lote_id: item.lote_id,
        promocion_id: item.promocion_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        descuento: item.descuento,
        total: item.total,
        iva_porcentaje: item.iva_porcentaje,
        iva_monto: item.iva_monto,
      })),
    });

    // STEP 10: Crear medios_pago_venta (bulk)
    await tx.medios_pago_venta.createMany({
      data: dto.medios_pago.map(mp => ({
        venta_id: venta.id,
        transaccion_id: venta.transaccion_id,
        medio_pago: mp.medio_pago,
        monto: mp.monto,
      })),
    });

    // STEP 11: Crear movimientos_stock (uno por item procesado)
    for (const item of itemsConDescuentos) {
      await tx.movimientos_stock.create({
        data: {
          producto_id: item.producto_id,
          lote_id: item.lote_id,
          tipo_movimiento: 'venta',
          cantidad: item.cantidad, // Positivo, trigger lo convierte a negativo
          referencia: numeroTicket,
          venta_id: venta.id,
          usuario_id: userId,
        },
      });
    }

    // STEP 12: Emitir evento
    await this.eventBus.publish(new SaleCompletedEvent(venta.id));

    // STEP 13: Retornar respuesta
    const ventaCompleta = await this.repository.findById(venta.id);
    return this.mapToResponseDto(ventaCompleta);
  }, {
    isolationLevel: 'Serializable', // CRÍTICO para evitar race conditions en stock
    timeout: 10000, // 10 segundos max
  });
}
```

### 1.6 Critical Tests

```typescript
describe('SalesService', () => {
  // ✅ E2E: Venta completa con múltiples items
  it('should create venta with multiple items and update stock', async () => {
    // Given: 2 productos con stock disponible
    // When: createVenta({ items: [prod1 x3, prod2 x5], medios_pago: [efectivo: 1000] })
    // Then: 
    //   - venta created with numero_ticket "CAJA1-{hoy}-0001"
    //   - 2 detalle_ventas created
    //   - 1 medio_pago_venta created
    //   - 2 movimientos_stock created (tipo: venta)
    //   - stock actualizado (trigger)
  });

  // ✅ E2E: Venta con promoción auto-aplicada
  it('should apply promotion automatically and calculate discount', async () => {
    // Given: producto con promocion vigente (10% descuento)
    // When: createVenta({ items: [prod x1] })
    // Then:
    //   - detalle_venta.promocion_id = promocion.id
    //   - detalle_venta.descuento = subtotal * 0.10
    //   - detalle_venta.total = subtotal - descuento
  });

  // ✅ E2E: Split tickets (múltiples medios pago)
  it('should create venta with multiple payment methods', async () => {
    // Given: venta total = $5000
    // When: createVenta({ medios_pago: [efectivo: 3000, debito: 2000] })
    // Then:
    //   - venta.total = 5000
    //   - venta.vuelto = 0
    //   - 2 medios_pago_venta created
    //   - SUM(medios_pago_venta.monto) = 5000
  });

  // ✅ E2E: Productos F/V/P/C con precio manual
  it('should validate precio_manual for special products', async () => {
    // Given: producto F (Fiambre) with requiere_precio_manual = true
    // When: createVenta({ items: [{ producto_id: F, precio_manual: 1500 }] })
    // Then: detalle_venta.precio_unitario = 1500
  });

  it('should reject venta if precio_manual missing for F/V/P/C', async () => {
    // Given: producto V (Verdulería) with requiere_precio_manual = true
    // When: createVenta({ items: [{ producto_id: V, precio_manual: null }] })
    // Then: throw BusinessRuleException "requiere precio manual"
  });

  it('should reject precio_manual out of range', async () => {
    // Given: producto P (Panadería)
    // When: createVenta({ items: [{ producto_id: P, precio_manual: 1000000 }] })
    // Then: throw BusinessRuleException "entre $0.01 y $999999"
  });

  // ✅ E2E: FEFO selection (múltiples lotes)
  it('should select lotes by FEFO (oldest expiration first)', async () => {
    // Given: 
    //   - producto maneja_lotes = true
    //   - lote1 (vence 2026-05-01, stock: 10)
    //   - lote2 (vence 2026-06-01, stock: 20)
    // When: createVenta({ items: [{ producto_id: prod, cantidad: 25 }] })
    // Then:
    //   - 2 detalle_ventas created
    //   - detalle1: lote_id = lote1, cantidad = 10
    //   - detalle2: lote_id = lote2, cantidad = 15
  });

  // ✅ Unit: Cálculo totales (subtotal, IVA, descuentos)
  it('should calculate totales correctly', async () => {
    // Given: items = [{ precio: 100, cantidad: 2, descuento: 10 }]
    // When: calcularTotales(items)
    // Then:
    //   - subtotal = 200
    //   - descuentos = 10
    //   - total = 190
  });

  // ✅ Unit: Validación stock insuficiente
  it('should reject venta if stock insufficient', async () => {
    // Given: producto stock = 5
    // When: createVenta({ items: [{ producto_id: prod, cantidad: 10 }] })
    // Then: throw BusinessRuleException "Stock insuficiente: faltan 5 unidades"
  });

  // ✅ Unit: Validación suma medios pago < total
  it('should reject venta if payment insufficient', async () => {
    // Given: total = 1000
    // When: validateMediosPago(1000, [{ efectivo: 500 }])
    // Then: throw BusinessRuleException "Pago insuficiente"
  });

  // ✅ Unit: Anulación de venta
  it('should mark venta as anulada', async () => {
    // Given: venta exists (anulada = false)
    // When: anularVenta(id, "Error de precio")
    // Then:
    //   - venta.anulada = true
    //   - venta.motivo_anulacion = "Error de precio"
    //   - venta.fecha_anulacion = NOW()
  });

  it('should reject anular if already anulada', async () => {
    // Given: venta with anulada = true
    // When: anularVenta(id)
    // Then: throw BusinessRuleException "Venta ya anulada"
  });

  // ✅ Integration: Transaction rollback si falla
  it('should rollback transaction if stock update fails', async () => {
    // Given: venta en proceso
    // When: falla movimientos_stock (mock error)
    // Then:
    //   - venta NOT created
    //   - detalle_ventas NOT created
    //   - medios_pago_venta NOT created
    //   - stock NO actualizado
  });

  // ✅ E2E: Generación número de ticket
  it('should generate unique numero_ticket per caja per day', async () => {
    // Given: CAJA1 has 3 ventas today (ultimo: CAJA1-20260420-0003)
    // When: createVenta({ caja_id: CAJA1 })
    // Then: numero_ticket = "CAJA1-20260420-0004"
  });

  it('should reset sequence next day', async () => {
    // Given: ayer CAJA1 llegó a CAJA1-20260419-0050
    // When: createVenta({ caja_id: CAJA1 }) HOY
    // Then: numero_ticket = "CAJA1-20260420-0001"
  });
});
```

### 1.7 Guards

```typescript
// sales.controller.ts
@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  @Post()
  @Roles('cajero', 'encargado', 'admin')
  create(@Body() dto: CreateVentaDto, @CurrentUser() user: User) {
    return this.salesService.createVenta(dto, user.id);
  }

  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: FilterVentasDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get('ticket/:numero')
  @Roles('cajero', 'encargado', 'admin')
  findByNumeroTicket(@Param('numero') numero: string) {
    return this.salesService.findByNumeroTicket(numero);
  }

  @Post(':id/anular')
  @Roles('encargado', 'admin')
  anular(
    @Param('id') id: string, 
    @Body() dto: AnularVentaDto,
    @CurrentUser() user: User
  ) {
    return this.salesService.anularVenta(id, dto, user.id);
  }
}
```

---

## 2. DEVOLUCIONESMODULE

### 2.1 API Contracts

```typescript
// POST /devoluciones (crear devolución)
// GET /devoluciones?venta_id={uuid}&fecha_desde={date}&page=1&limit=20
// GET /devoluciones/:id (detalle completo)
// GET /devoluciones/venta/:id (todas las devoluciones de una venta)
```

**Roles:**
- `POST`: cajero, encargado, admin
- `GET`: cajero, encargado, admin

### 2.2 Key DTOs

```typescript
// create-devolucion.dto.ts
export class CreateDevolucionDto {
  @IsUUID()
  venta_id: string;

  @IsUUID()
  producto_id: string;

  @IsOptional()
  @IsUUID()
  lote_id?: string; // Producto vuelve al MISMO lote

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsIn(['efectivo', 'transferencia', 'nota_credito'])
  tipo_devolucion: string;

  @IsIn(['efectivo', 'transferencia', 'nota_credito'])
  medio_devolucion: string;

  @IsString()
  @MinLength(5)
  motivo: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// filter-devoluciones.dto.ts
export class FilterDevolucionesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  venta_id?: string;

  @IsOptional()
  @IsUUID()
  producto_id?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  tipo_devolucion?: string;
}

// devolucion-response.dto.ts
export class DevolucionResponseDto {
  devolucion: {
    id: string;
    venta_id: string;
    producto_id: string;
    lote_id: string | null;
    cantidad: number;
    monto_devuelto: number;
    tipo_devolucion: string;
    medio_devolucion: string;
    motivo: string;
    fecha: Date;
  };
  producto: {
    codigo: string;
    detalle: string;
  };
}
```

### 2.3 Business Rules (Retorno mismo lote)

#### 2.3.1 Validación Cantidad Disponible

- **Regla:** `cantidad_devolver <= cantidad_vendida - SUM(devoluciones_previas)`
- **Query crítica:**

```typescript
async validateCantidadDisponible(
  ventaId: string, 
  productoId: string, 
  cantidadDevolver: number
): Promise<void> {
  const result = await this.prisma.$queryRaw<{ disponible: number }[]>`
    SELECT 
      dv.cantidad AS cantidad_vendida,
      COALESCE(SUM(d.cantidad), 0) AS cantidad_ya_devuelta,
      (dv.cantidad - COALESCE(SUM(d.cantidad), 0)) AS disponible
    FROM detalle_ventas dv
    LEFT JOIN devoluciones d 
      ON dv.venta_id = d.venta_id 
      AND dv.producto_id = d.producto_id
    WHERE dv.venta_id = ${ventaId}::uuid 
      AND dv.producto_id = ${productoId}::uuid
    GROUP BY dv.cantidad
  `;

  if (!result.length || result[0].disponible < cantidadDevolver) {
    throw new BusinessRuleException(
      `Cantidad no disponible para devolución. Máximo: ${result[0]?.disponible || 0}`
    );
  }
}
```

#### 2.3.2 Retorno al Mismo Lote

- **Regla:** Producto devuelto vuelve al MISMO lote del que salió
- **Implementación:**

```typescript
async getLoteOriginal(ventaId: string, productoId: string): Promise<string | null> {
  const detalleVenta = await this.prisma.detalle_ventas.findFirst({
    where: { venta_id: ventaId, producto_id: productoId },
    select: { lote_id: true },
  });

  return detalleVenta?.lote_id || null;
}
```

#### 2.3.3 Cálculo Monto Devuelto

- **Regla:** Monto devuelto = precio unitario (con descuento aplicado) * cantidad
- **Si hubo descuento en venta, aplicar proporcionalmente:**

```typescript
async calcularMontoDevuelto(
  ventaId: string, 
  productoId: string, 
  cantidadDevolver: number
): Promise<number> {
  const detalleVenta = await this.prisma.detalle_ventas.findFirst({
    where: { venta_id: ventaId, producto_id: productoId },
  });

  if (!detalleVenta) {
    throw new NotFoundException('Producto no encontrado en venta');
  }

  // Precio con descuento aplicado
  const precioConDescuento = detalleVenta.total / detalleVenta.cantidad;
  
  return precioConDescuento * cantidadDevolver;
}
```

#### 2.3.4 Devoluciones Parciales Múltiples

- **Escenario:** Cliente compró 10 unidades, devuelve 3 hoy, 2 mañana
- **Validación:** Cada devolución valida contra `SUM(devoluciones_previas)`

```typescript
// Ejemplo query para validar múltiples devoluciones
// Venta original: cantidad = 10
// Devolución 1: cantidad = 3 → disponible = 10 - 3 = 7 ✅
// Devolución 2: cantidad = 2 → disponible = 10 - (3+2) = 5 ✅
// Devolución 3: cantidad = 6 → disponible = 10 - (3+2+6) = -1 ❌ REJECT
```

### 2.4 Repository Queries

```typescript
// devoluciones.repository.ts

// GET all (con filtros)
async findAll(filters: FilterDevolucionesDto): Promise<{ data: Devolucion[]; total: number }> {
  const where: Prisma.DevolucionesWhereInput = {
    venta_id: filters.venta_id,
    producto_id: filters.producto_id,
    tipo_devolucion: filters.tipo_devolucion,
    fecha: {
      gte: filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
      lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.devoluciones.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { fecha: 'desc' },
      include: {
        productos: { select: { codigo: true, detalle: true } },
        ventas: { select: { numero_ticket: true } },
        usuarios: { select: { username: true } },
      },
    }),
    prisma.devoluciones.count({ where }),
  ]);

  return { data, total };
}

// GET by ID
async findById(id: string): Promise<Devolucion | null> {
  return prisma.devoluciones.findUnique({
    where: { id },
    include: {
      productos: true,
      ventas: true,
      lotes: { select: { numero_lote: true } },
      usuarios: { select: { username: true } },
    },
  });
}

// GET by venta_id
async findByVenta(ventaId: string): Promise<Devolucion[]> {
  return prisma.devoluciones.findMany({
    where: { venta_id: ventaId },
    orderBy: { fecha: 'desc' },
    include: {
      productos: { select: { codigo: true, detalle: true } },
    },
  });
}

// GET total devuelto por producto en venta (para validación)
async getTotalDevuelto(ventaId: string, productoId: string): Promise<number> {
  const result = await prisma.devoluciones.aggregate({
    where: { venta_id: ventaId, producto_id: productoId },
    _sum: { cantidad: true },
  });

  return result._sum.cantidad || 0;
}

// POST create devolucion (TRANSACTION)
async create(data: CreateDevolucionData, tx: PrismaTransaction): Promise<Devolucion> {
  return tx.devoluciones.create({
    data: {
      venta_id: data.venta_id,
      producto_id: data.producto_id,
      lote_id: data.lote_id,
      cantidad: data.cantidad,
      monto_devuelto: data.monto_devuelto,
      tipo_devolucion: data.tipo_devolucion,
      medio_devolucion: data.medio_devolucion,
      usuario_id: data.usuario_id,
      motivo: data.motivo,
      observaciones: data.observaciones,
    },
  });
}
```

### 2.5 Transaction Flow

```typescript
// devoluciones.service.ts

async createDevolucion(dto: CreateDevolucionDto, userId: string): Promise<DevolucionResponseDto> {
  return this.prisma.$transaction(async (tx) => {
    // STEP 1: Validar que venta exista y no esté anulada
    const venta = await tx.ventas.findUnique({ where: { id: dto.venta_id } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.anulada) throw new BusinessRuleException('No se puede devolver de venta anulada');

    // STEP 2: Validar cantidad disponible
    await this.validateCantidadDisponible(dto.venta_id, dto.producto_id, dto.cantidad);

    // STEP 3: Obtener lote original (si aplica)
    const loteId = await this.getLoteOriginal(dto.venta_id, dto.producto_id);

    // STEP 4: Calcular monto devuelto
    const montoDevuelto = await this.calcularMontoDevuelto(
      dto.venta_id, 
      dto.producto_id, 
      dto.cantidad
    );

    // STEP 5: Crear devolución
    const devolucion = await tx.devoluciones.create({
      data: {
        venta_id: dto.venta_id,
        producto_id: dto.producto_id,
        lote_id: loteId,
        cantidad: dto.cantidad,
        monto_devuelto: montoDevuelto,
        tipo_devolucion: dto.tipo_devolucion,
        medio_devolucion: dto.medio_devolucion,
        usuario_id: userId,
        motivo: dto.motivo,
        observaciones: dto.observaciones,
      },
    });

    // STEP 6: Crear movimiento_stock (devolución incrementa stock)
    await tx.movimientos_stock.create({
      data: {
        producto_id: dto.producto_id,
        lote_id: loteId,
        tipo_movimiento: 'devolucion',
        cantidad: dto.cantidad, // Positivo (incrementa)
        referencia: `Devolucion venta ${venta.numero_ticket}`,
        venta_id: dto.venta_id,
        usuario_id: userId,
      },
    });

    // STEP 7: Emitir evento
    await this.eventBus.publish(new DevolucionCreatedEvent(devolucion.id));

    // STEP 8: Retornar respuesta
    const devolucionCompleta = await this.repository.findById(devolucion.id);
    return this.mapToResponseDto(devolucionCompleta);
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 5000,
  });
}
```

### 2.6 Critical Tests

```typescript
describe('DevolucionesService', () => {
  // ✅ Devolución total
  it('should create devolucion total and update stock', async () => {
    // Given: venta with producto cantidad = 5
    // When: createDevolucion({ venta_id, producto_id, cantidad: 5 })
    // Then:
    //   - devolucion created
    //   - monto_devuelto = precio_unitario * 5
    //   - movimiento_stock created (tipo: devolucion, cantidad: 5)
    //   - stock incrementado
  });

  // ✅ Devolución parcial (primera vez)
  it('should create devolucion parcial', async () => {
    // Given: venta with producto cantidad = 10
    // When: createDevolucion({ cantidad: 3 })
    // Then: devolucion created with cantidad = 3, disponible restante = 7
  });

  // ✅ Devolución parcial (segunda vez)
  it('should allow multiple devoluciones parciales', async () => {
    // Given: 
    //   - venta cantidad = 10
    //   - devolucion1 cantidad = 3 (disponible = 7)
    // When: createDevolucion({ cantidad: 2 })
    // Then: devolucion created, disponible restante = 5
  });

  // ✅ Validación cantidad disponible
  it('should reject devolucion if cantidad exceeds disponible', async () => {
    // Given: venta cantidad = 10, devolucion1 = 3, devolucion2 = 2
    // When: createDevolucion({ cantidad: 6 }) // 3+2+6 = 11 > 10
    // Then: throw BusinessRuleException "Cantidad no disponible"
  });

  // ✅ Cálculo monto con descuento proporcional
  it('should calculate monto_devuelto with discount', async () => {
    // Given: 
    //   - detalle_venta: cantidad = 10, subtotal = 1000, descuento = 100, total = 900
    //   - precio con descuento = 900 / 10 = 90
    // When: createDevolucion({ cantidad: 5 })
    // Then: monto_devuelto = 90 * 5 = 450
  });

  // ✅ Retorno mismo lote
  it('should return producto to same lote', async () => {
    // Given: detalle_venta with lote_id = lote-A
    // When: createDevolucion({ venta_id, producto_id })
    // Then: devolucion.lote_id = lote-A
  });

  // ✅ Incremento de stock
  it('should increment stock in lote', async () => {
    // Given: lote stock = 50, venta cantidad = 10
    // When: createDevolucion({ cantidad: 10 })
    // Then: lote stock = 60 (trigger updates)
  });

  // ✅ Validar venta no anulada
  it('should reject devolucion from anulada venta', async () => {
    // Given: venta with anulada = true
    // When: createDevolucion({ venta_id })
    // Then: throw BusinessRuleException "No se puede devolver de venta anulada"
  });
});
```

### 2.7 Guards

```typescript
// devoluciones.controller.ts
@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  @Post()
  @Roles('cajero', 'encargado', 'admin')
  create(@Body() dto: CreateDevolucionDto, @CurrentUser() user: User) {
    return this.devolucionesService.createDevolucion(dto, user.id);
  }

  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: FilterDevolucionesDto) {
    return this.devolucionesService.findAll(query);
  }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findOne(@Param('id') id: string) {
    return this.devolucionesService.findOne(id);
  }

  @Get('venta/:id')
  @Roles('cajero', 'encargado', 'admin')
  findByVenta(@Param('id') id: string) {
    return this.devolucionesService.findByVenta(id);
  }
}
```

---

## 3. CAJASMODULE

### 3.1 API Contracts

```typescript
// GET /cajas?activo=true
// GET /cajas/:id
// POST /cajas
// PATCH /cajas/:id
// DELETE /cajas/:id (soft delete)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: admin

### 3.2 Key DTOs

```typescript
// create-caja.dto.ts
export class CreateCajaDto {
  @IsInt()
  @Min(1)
  numero: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string; // "Caja 1", "Caja Express"

  @IsOptional()
  @IsString()
  descripcion?: string;
}

// update-caja.dto.ts
export class UpdateCajaDto extends PartialType(CreateCajaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// filter-cajas.dto.ts
export class FilterCajasDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

### 3.3 Business Rules

- **Número único:** `numero` debe ser único (1, 2, 3, ...)
- **Soft delete:** Marcar `activo = false`, no eliminar físicamente
- **Restricción FK:** No desactivar si tiene ventas del día
- **Defaults:** `activo = true`

### 3.4 Repository Queries

```typescript
// cajas.repository.ts

// GET all (con filtro activo)
async findAll(filters?: FilterCajasDto): Promise<Caja[]> {
  return prisma.cajas.findMany({
    where: { activo: filters?.activo ?? true },
    orderBy: { numero: 'asc' },
  });
}

// GET by ID
async findById(id: string): Promise<Caja | null> {
  return prisma.cajas.findUnique({ where: { id } });
}

// GET by numero
async findByNumero(numero: number): Promise<Caja | null> {
  return prisma.cajas.findUnique({ where: { numero } });
}

// POST create
async create(dto: CreateCajaDto): Promise<Caja> {
  // Validar numero único
  const exists = await this.findByNumero(dto.numero);
  if (exists) throw new ConflictException('Número de caja ya existe');

  return prisma.cajas.create({ data: dto });
}

// PATCH update
async update(id: string, dto: UpdateCajaDto): Promise<Caja> {
  const caja = await this.findById(id);
  if (!caja) throw new NotFoundException('Caja no encontrada');

  // Si cambia numero, validar unicidad
  if (dto.numero && dto.numero !== caja.numero) {
    const duplicate = await this.findByNumero(dto.numero);
    if (duplicate) throw new ConflictException('Número ya existe');
  }

  return prisma.cajas.update({
    where: { id },
    data: { ...dto, updated_at: new Date() },
  });
}

// DELETE soft delete
async softDelete(id: string): Promise<void> {
  const caja = await this.findById(id);
  if (!caja) throw new NotFoundException('Caja no encontrada');

  // Validar que no tenga ventas del día
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const ventasHoy = await prisma.ventas.count({
    where: { caja_id: id, fecha: { gte: hoy, lt: manana } },
  });

  if (ventasHoy > 0) {
    throw new ConflictException('No se puede desactivar: tiene ventas del día');
  }

  await prisma.cajas.update({
    where: { id },
    data: { activo: false, updated_at: new Date() },
  });
}
```

### 3.5 Critical Tests

```typescript
describe('CajasService', () => {
  // ✅ CRUD básico
  it('should create caja with unique numero', async () => {
    // When: create({ numero: 1, nombre: "Caja 1" })
    // Then: caja created, activo = true
  });

  it('should reject duplicate numero', async () => {
    // Given: caja numero = 1 exists
    // When: create({ numero: 1 })
    // Then: throw ConflictException "Número de caja ya existe"
  });

  it('should update caja', async () => {
    // Given: caja exists
    // When: update({ nombre: "Caja Express" })
    // Then: caja updated, updated_at changed
  });

  // ✅ Soft delete
  it('should soft delete caja without ventas', async () => {
    // Given: caja without ventas hoy
    // When: softDelete(id)
    // Then: caja.activo = false
  });

  it('should block soft delete if ventas hoy', async () => {
    // Given: caja has 5 ventas hoy
    // When: softDelete(id)
    // Then: throw ConflictException "tiene ventas del día"
  });
});
```

### 3.6 Guards

```typescript
// cajas.controller.ts
@Controller('cajas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CajasController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: FilterCajasDto) { }

  @Get(':id')
  @Roles('cajero', 'encargado', 'admin')
  findOne(@Param('id') id: string) { }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateCajaDto) { }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCajaDto) { }

  @Delete(':id')
  @Roles('admin')
  softDelete(@Param('id') id: string) { }
}
```

---

## 4. MOVIMIENTOSCAJAMODULE

### 4.1 API Contracts

```typescript
// POST /movimientos-caja (crear gasto/retiro/ingreso)
// GET /movimientos-caja?tipo={tipo}&fecha_desde={date}&page=1&limit=20
// GET /movimientos-caja/:id
```

**Roles:**
- `POST`: admin
- `GET`: admin, encargado

### 4.2 Key DTOs

```typescript
// create-movimiento-caja.dto.ts
export class CreateMovimientoCajaDto {
  @IsIn(['gasto', 'retiro'])
  tipo: string; // Enum: gasto, retiro

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  concepto: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  comprobante?: string; // Número de factura, recibo

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// filter-movimientos-caja.dto.ts
export class FilterMovimientosCajaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['gasto', 'retiro'])
  tipo?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
```

### 4.3 Business Rules

- **Tipos válidos:** `gasto` (pago servicios, compras), `retiro` (retiro efectivo)
- **Solo desde admin panel:** NO desde POS
- **Registro auditoría:** `usuario_id` (quién registró), `fecha` (cuándo)
- **Afecta cierre de caja:** Se descuentan del efectivo_sistema en cierre

### 4.4 Repository Queries

```typescript
// movimientos-caja.repository.ts

// GET all (con filtros)
async findAll(filters: FilterMovimientosCajaDto): Promise<{ data: MovimientoCaja[]; total: number }> {
  const where: Prisma.MovimientosCajaWhereInput = {
    tipo: filters.tipo,
    fecha: {
      gte: filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
      lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.movimientos_caja.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { fecha: 'desc' },
      include: {
        usuarios: { select: { username: true } },
      },
    }),
    prisma.movimientos_caja.count({ where }),
  ]);

  return { data, total };
}

// GET by ID
async findById(id: string): Promise<MovimientoCaja | null> {
  return prisma.movimientos_caja.findUnique({
    where: { id },
    include: {
      usuarios: { select: { username: true } },
    },
  });
}

// GET by fecha (para cálculos de cierre)
async findByFecha(desde: Date, hasta: Date): Promise<MovimientoCaja[]> {
  return prisma.movimientos_caja.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
    },
    orderBy: { fecha: 'asc' },
  });
}

// POST create
async create(dto: CreateMovimientoCajaDto, userId: string): Promise<MovimientoCaja> {
  return prisma.movimientos_caja.create({
    data: {
      tipo: dto.tipo,
      monto: dto.monto,
      concepto: dto.concepto,
      comprobante: dto.comprobante,
      observaciones: dto.observaciones,
      usuario_id: userId,
    },
  });
}
```

### 4.5 Critical Tests

```typescript
describe('MovimientosCajaService', () => {
  // ✅ CRUD básico
  it('should create movimiento gasto', async () => {
    // When: create({ tipo: 'gasto', monto: 500, concepto: 'Luz' })
    // Then: movimiento created, tipo = 'gasto'
  });

  it('should create movimiento retiro', async () => {
    // When: create({ tipo: 'retiro', monto: 10000 })
    // Then: movimiento created
  });

  // ✅ Filtros
  it('should filter by tipo', async () => {
    // Given: 3 gastos, 2 retiros
    // When: findAll({ tipo: 'gasto' })
    // Then: returns 3 movimientos
  });

  it('should filter by fecha', async () => {
    // Given: movimientos en múltiples fechas
    // When: findAll({ fecha_desde: '2026-04-20' })
    // Then: returns only movimientos >= fecha
  });
});
```

### 4.6 Guards

```typescript
// movimientos-caja.controller.ts
@Controller('movimientos-caja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosCajaController {
  @Post()
  @Roles('admin')
  create(@Body() dto: CreateMovimientoCajaDto, @CurrentUser() user: User) {
    return this.movimientosCajaService.create(dto, user.id);
  }

  @Get()
  @Roles('admin', 'encargado')
  findAll(@Query() query: FilterMovimientosCajaDto) {
    return this.movimientosCajaService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'encargado')
  findOne(@Param('id') id: string) {
    return this.movimientosCajaService.findOne(id);
  }
}
```

---

## 5. CIERRESCAJAMODULE

### 5.1 API Contracts

```typescript
// POST /cierres-caja (crear cierre diario)
// GET /cierres-caja?caja_id={uuid}&fecha={date}
// GET /cierres-caja/:id (detalle completo)
// GET /cierres-caja/calcular?caja_id={uuid}&fecha={date} (calcular totales sin guardar)
```

**Roles:**
- `POST`: admin, encargado
- `GET`: admin, encargado

### 5.2 Key DTOs

```typescript
// create-cierre-caja.dto.ts
export class CreateCierreCajaDto {
  @IsUUID()
  caja_id: string;

  @IsDateString()
  fecha: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0)
  efectivo_fisico: number; // Lo que realmente hay contado

  @IsOptional()
  @IsString()
  motivo_diferencia?: string; // REQUERIDO si diferencia != 0

  @IsOptional()
  @IsString()
  observaciones?: string;
}

// filter-cierres-caja.dto.ts
export class FilterCierresCajaDto {
  @IsOptional()
  @IsUUID()
  caja_id?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}

// cierre-caja-response.dto.ts
export class CierreCajaResponseDto {
  cierre: {
    id: string;
    caja_id: string;
    fecha: Date;
    total_efectivo: number;
    total_debito: number;
    total_credito: number;
    total_transferencia: number;
    total_qr: number;
    total_ventas: number;
    efectivo_sistema: number;
    efectivo_fisico: number;
    diferencia_efectivo: number;
    motivo_diferencia: string | null;
  };
  caja: {
    numero: number;
    nombre: string;
  };
}

// totales-caja.dto.ts (para endpoint calcular)
export class TotalesCajaDto {
  total_efectivo: number;
  total_debito: number;
  total_credito: number;
  total_transferencia: number;
  total_qr: number;
  total_ventas: number;
  efectivo_sistema: number; // Efectivo esperado según sistema
  total_gastos: number;
  total_retiros: number;
}
```

### 5.3 Business Rules (Diferencia efectivo)

#### 5.3.1 Cierre Único por Caja por Día

- **Constraint:** `UNIQUE (caja_id, fecha)`
- **Validación:**

```typescript
async validateCierreNoExiste(cajaId: string, fecha: Date): Promise<void> {
  const fechaSolo = new Date(fecha);
  fechaSolo.setHours(0, 0, 0, 0);

  const exists = await this.prisma.cierres_caja.findFirst({
    where: {
      caja_id: cajaId,
      fecha: fechaSolo,
    },
  });

  if (exists) {
    throw new ConflictException('Ya existe cierre para esta caja y fecha');
  }
}
```

#### 5.3.2 Cálculo Diferencia Efectivo

- **Fórmula:** `diferencia_efectivo = efectivo_fisico - efectivo_sistema`
- **Positivo:** Sobrante (+ dinero)
- **Negativo:** Faltante (- dinero)
- **Notificación:** Si `diferencia_efectivo != 0`, emitir evento `DiferenciaEfectivoDetectedEvent`

```typescript
calcularDiferencia(efectivoFisico: number, efectivoSistema: number): number {
  return efectivoFisico - efectivoSistema;
}

// Ejemplo:
// efectivo_sistema = 45000 (lo que debe haber)
// efectivo_fisico = 44800 (lo que realmente hay)
// diferencia_efectivo = -200 (faltante)
```

#### 5.3.3 Validación Motivo Diferencia

- **Regla:** Si `diferencia_efectivo != 0`, `motivo_diferencia` es REQUERIDO

```typescript
async validateMotivoSiDiferencia(dto: CreateCierreCajaDto, diferencia: number): Promise<void> {
  if (diferencia !== 0 && !dto.motivo_diferencia) {
    throw new BusinessRuleException(
      `Diferencia de efectivo detectada ($${diferencia}). Debe proporcionar motivo.`
    );
  }
}
```

### 5.4 Repository Queries

```typescript
// cierres-caja.repository.ts

// GET all (con filtros)
async findAll(filters: FilterCierresCajaDto): Promise<CierreCaja[]> {
  const where: Prisma.CierresCajaWhereInput = {
    caja_id: filters.caja_id,
    fecha: filters.fecha 
      ? new Date(filters.fecha)
      : {
          gte: filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
          lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
        },
  };

  return prisma.cierres_caja.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: {
      cajas: { select: { numero: true, nombre: true } },
      usuarios: { select: { username: true } },
    },
  });
}

// GET by ID
async findById(id: string): Promise<CierreCaja | null> {
  return prisma.cierres_caja.findUnique({
    where: { id },
    include: {
      cajas: { select: { numero: true, nombre: true } },
      usuarios: { select: { username: true } },
    },
  });
}

// GET by caja y fecha
async findByCajaAndFecha(cajaId: string, fecha: Date): Promise<CierreCaja | null> {
  const fechaSolo = new Date(fecha);
  fechaSolo.setHours(0, 0, 0, 0);

  return prisma.cierres_caja.findFirst({
    where: {
      caja_id: cajaId,
      fecha: fechaSolo,
    },
  });
}

// POST create (TRANSACTION)
async create(data: CreateCierreCajaData, tx: PrismaTransaction): Promise<CierreCaja> {
  return tx.cierres_caja.create({
    data: {
      caja_id: data.caja_id,
      fecha: data.fecha,
      total_efectivo: data.total_efectivo,
      total_debito: data.total_debito,
      total_credito: data.total_credito,
      total_transferencia: data.total_transferencia,
      total_qr: data.total_qr,
      total_ventas: data.total_ventas,
      efectivo_sistema: data.efectivo_sistema,
      efectivo_fisico: data.efectivo_fisico,
      diferencia_efectivo: data.diferencia_efectivo,
      motivo_diferencia: data.motivo_diferencia,
      usuario_id: data.usuario_id,
      observaciones: data.observaciones,
    },
  });
}
```

### 5.5 Critical Calculations

```typescript
// cierres-caja.service.ts

async calcularTotalesDia(cajaId: string, fecha: Date): Promise<TotalesCajaDto> {
  const fechaInicio = new Date(fecha);
  fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + 1);

  // STEP 1: Obtener ventas del día (NO anuladas)
  const ventas = await this.prisma.ventas.findMany({
    where: {
      caja_id: cajaId,
      fecha: { gte: fechaInicio, lt: fechaFin },
      anulada: false,
    },
    include: {
      medios_pago_venta: true,
    },
  });

  // STEP 2: Calcular totales por medio de pago
  let totalEfectivo = 0;
  let totalDebito = 0;
  let totalCredito = 0;
  let totalTransferencia = 0;
  let totalQr = 0;

  for (const venta of ventas) {
    for (const mp of venta.medios_pago_venta) {
      switch (mp.medio_pago) {
        case 'efectivo': totalEfectivo += mp.monto; break;
        case 'debito': totalDebito += mp.monto; break;
        case 'credito': totalCredito += mp.monto; break;
        case 'transferencia': totalTransferencia += mp.monto; break;
        case 'qr': totalQr += mp.monto; break;
      }
    }
  }

  // STEP 3: Obtener movimientos de caja (gastos y retiros)
  const movimientos = await this.prisma.movimientos_caja.findMany({
    where: {
      fecha: { gte: fechaInicio, lt: fechaFin },
    },
  });

  const totalGastos = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const totalRetiros = movimientos
    .filter(m => m.tipo === 'retiro')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  // STEP 4: Calcular efectivo_sistema
  // efectivo_sistema = efectivo de ventas - gastos - retiros
  const efectivoSistema = totalEfectivo - totalGastos - totalRetiros;

  // STEP 5: Calcular total_ventas
  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

  return {
    total_efectivo: totalEfectivo,
    total_debito: totalDebito,
    total_credito: totalCredito,
    total_transferencia: totalTransferencia,
    total_qr: totalQr,
    total_ventas: totalVentas,
    efectivo_sistema: efectivoSistema,
    total_gastos: totalGastos,
    total_retiros: totalRetiros,
  };
}
```

### 5.6 Transaction Flow

```typescript
// cierres-caja.service.ts

async createCierre(dto: CreateCierreCajaDto, userId: string): Promise<CierreCajaResponseDto> {
  return this.prisma.$transaction(async (tx) => {
    // STEP 1: Validar que no exista cierre para esa caja y fecha
    await this.validateCierreNoExiste(dto.caja_id, new Date(dto.fecha));

    // STEP 2: Calcular totales del día
    const totales = await this.calcularTotalesDia(dto.caja_id, new Date(dto.fecha));

    // STEP 3: Calcular diferencia efectivo
    const diferenciaEfectivo = this.calcularDiferencia(
      dto.efectivo_fisico, 
      totales.efectivo_sistema
    );

    // STEP 4: Validar motivo si diferencia != 0
    await this.validateMotivoSiDiferencia(dto, diferenciaEfectivo);

    // STEP 5: Crear cierre
    const cierre = await tx.cierres_caja.create({
      data: {
        caja_id: dto.caja_id,
        fecha: new Date(dto.fecha),
        total_efectivo: totales.total_efectivo,
        total_debito: totales.total_debito,
        total_credito: totales.total_credito,
        total_transferencia: totales.total_transferencia,
        total_qr: totales.total_qr,
        total_ventas: totales.total_ventas,
        efectivo_sistema: totales.efectivo_sistema,
        efectivo_fisico: dto.efectivo_fisico,
        diferencia_efectivo: diferenciaEfectivo,
        motivo_diferencia: dto.motivo_diferencia,
        usuario_id: userId,
        observaciones: dto.observaciones,
      },
    });

    // STEP 6: Emitir eventos
    await this.eventBus.publish(new CierreCajaCreatedEvent(cierre.id));
    
    if (diferenciaEfectivo !== 0) {
      await this.eventBus.publish(
        new DiferenciaEfectivoDetectedEvent(cierre.id, diferenciaEfectivo)
      );
    }

    // STEP 7: Retornar respuesta
    const cierreCompleto = await this.repository.findById(cierre.id);
    return this.mapToResponseDto(cierreCompleto);
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 5000,
  });
}
```

### 5.7 Critical Tests

```typescript
describe('CierresCajaService', () => {
  // ✅ Cálculo totales día (mock ventas y medios pago)
  it('should calculate totales correctly', async () => {
    // Given:
    //   - venta1: efectivo 1000, debito 500
    //   - venta2: efectivo 2000
    //   - gasto: 300
    //   - retiro: 1000
    // When: calcularTotalesDia(caja_id, fecha)
    // Then:
    //   - total_efectivo = 3000
    //   - total_debito = 500
    //   - total_ventas = 3500
    //   - efectivo_sistema = 3000 - 300 - 1000 = 1700
  });

  // ✅ Cierre con diferencia efectivo = 0
  it('should create cierre with no diferencia', async () => {
    // Given: efectivo_sistema = 1700
    // When: createCierre({ efectivo_fisico: 1700 })
    // Then:
    //   - cierre created
    //   - diferencia_efectivo = 0
    //   - NO event DiferenciaEfectivoDetectedEvent
  });

  // ✅ Cierre con diferencia efectivo (sobrante)
  it('should create cierre with sobrante', async () => {
    // Given: efectivo_sistema = 1700
    // When: createCierre({ efectivo_fisico: 1750, motivo: "Error cobro" })
    // Then:
    //   - cierre created
    //   - diferencia_efectivo = +50
    //   - event DiferenciaEfectivoDetectedEvent emitted
  });

  // ✅ Cierre con diferencia efectivo (faltante)
  it('should create cierre with faltante', async () => {
    // Given: efectivo_sistema = 1700
    // When: createCierre({ efectivo_fisico: 1650, motivo: "Descuadre" })
    // Then:
    //   - cierre created
    //   - diferencia_efectivo = -50
    //   - event DiferenciaEfectivoDetectedEvent emitted
  });

  // ✅ Validación motivo si diferencia != 0
  it('should reject cierre if motivo missing and diferencia != 0', async () => {
    // Given: efectivo_sistema = 1700
    // When: createCierre({ efectivo_fisico: 1650, motivo: null })
    // Then: throw BusinessRuleException "Debe proporcionar motivo"
  });

  // ✅ Validación cierre único por día
  it('should reject duplicate cierre for same caja and fecha', async () => {
    // Given: cierre exists for caja1 fecha 2026-04-20
    // When: createCierre({ caja_id: caja1, fecha: '2026-04-20' })
    // Then: throw ConflictException "Ya existe cierre"
  });

  // ✅ Endpoint calcular (sin guardar)
  it('should calculate totales without saving', async () => {
    // When: GET /cierres-caja/calcular?caja_id=xxx&fecha=2026-04-20
    // Then: returns TotalesCajaDto with calculations
  });
});
```

### 5.8 Guards

```typescript
// cierres-caja.controller.ts
@Controller('cierres-caja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CierresCajaController {
  @Post()
  @Roles('admin', 'encargado')
  create(@Body() dto: CreateCierreCajaDto, @CurrentUser() user: User) {
    return this.cierresCajaService.createCierre(dto, user.id);
  }

  @Get()
  @Roles('admin', 'encargado')
  findAll(@Query() query: FilterCierresCajaDto) {
    return this.cierresCajaService.findAll(query);
  }

  @Get('calcular')
  @Roles('admin', 'encargado')
  calcular(@Query('caja_id') cajaId: string, @Query('fecha') fecha: string) {
    return this.cierresCajaService.calcularTotalesDia(cajaId, new Date(fecha));
  }

  @Get(':id')
  @Roles('admin', 'encargado')
  findOne(@Param('id') id: string) {
    return this.cierresCajaService.findOne(id);
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### SalesModule
- [ ] `sales.module.ts` (imports, providers, exports)
- [ ] `sales.controller.ts` (6 endpoints + guards)
- [ ] `sales.service.ts` (business logic + FEFO + precio manual)
- [ ] `repositories/ventas.repository.ts` (6 Prisma queries)
- [ ] `repositories/detalle-ventas.repository.ts` (bulk create)
- [ ] `repositories/medios-pago-venta.repository.ts` (bulk create)
- [ ] `services/venta-calculator.service.ts` (cálculo totales)
- [ ] `services/ticket-generator.service.ts` (generación numero_ticket)
- [ ] `dto/create-venta.dto.ts` (3 nested DTOs)
- [ ] `dto/ticket-item.dto.ts` (4 fields + validators)
- [ ] `dto/medio-pago.dto.ts` (2 fields + enum)
- [ ] `dto/anular-venta.dto.ts` (1 field)
- [ ] `dto/filter-ventas.dto.ts` (6 filters)
- [ ] `dto/venta-response.dto.ts` (nested structure)
- [ ] `__tests__/sales.service.spec.ts` (15 tests)
- [ ] `__tests__/venta-calculator.service.spec.ts` (5 tests)
- [ ] `__tests__/sales.e2e-spec.ts` (8 E2E tests)

### DevolucionesModule
- [ ] `devoluciones.module.ts`
- [ ] `devoluciones.controller.ts` (4 endpoints + guards)
- [ ] `devoluciones.service.ts` (business logic + validaciones)
- [ ] `repositories/devoluciones.repository.ts` (5 Prisma queries)
- [ ] `dto/create-devolucion.dto.ts` (7 fields + validators)
- [ ] `dto/filter-devoluciones.dto.ts` (6 filters)
- [ ] `dto/devolucion-response.dto.ts`
- [ ] `__tests__/devoluciones.service.spec.ts` (8 tests)
- [ ] `__tests__/devoluciones.e2e-spec.ts` (6 E2E tests)

### CajasModule
- [ ] `cajas.module.ts`
- [ ] `cajas.controller.ts` (5 endpoints + guards)
- [ ] `cajas.service.ts` (business logic)
- [ ] `repositories/cajas.repository.ts` (6 Prisma queries)
- [ ] `dto/create-caja.dto.ts` (3 fields)
- [ ] `dto/update-caja.dto.ts` (extends PartialType + activo)
- [ ] `dto/filter-cajas.dto.ts` (1 filter)
- [ ] `__tests__/cajas.service.spec.ts` (5 tests)
- [ ] `__tests__/cajas.e2e-spec.ts` (5 endpoints)

### MovimientosCajaModule
- [ ] `movimientos-caja.module.ts`
- [ ] `movimientos-caja.controller.ts` (3 endpoints + guards)
- [ ] `movimientos-caja.service.ts` (business logic)
- [ ] `repositories/movimientos-caja.repository.ts` (4 Prisma queries)
- [ ] `dto/create-movimiento-caja.dto.ts` (5 fields)
- [ ] `dto/filter-movimientos-caja.dto.ts` (5 filters)
- [ ] `__tests__/movimientos-caja.service.spec.ts` (4 tests)
- [ ] `__tests__/movimientos-caja.e2e-spec.ts` (3 endpoints)

### CierresCajaModule
- [ ] `cierres-caja.module.ts`
- [ ] `cierres-caja.controller.ts` (4 endpoints + guards)
- [ ] `cierres-caja.service.ts` (business logic + calculations)
- [ ] `repositories/cierres-caja.repository.ts` (4 Prisma queries)
- [ ] `dto/create-cierre-caja.dto.ts` (5 fields)
- [ ] `dto/filter-cierres-caja.dto.ts` (4 filters)
- [ ] `dto/cierre-caja-response.dto.ts` (nested structure)
- [ ] `dto/totales-caja.dto.ts` (9 fields)
- [ ] `__tests__/cierres-caja.service.spec.ts` (7 tests)
- [ ] `__tests__/cierres-caja.e2e-spec.ts` (4 endpoints)

---

## BUSINESS RULES SUMMARY

| Module | Key Rule | Validation |
|--------|----------|------------|
| **Sales** | Número ticket único | `CAJA{numero}-{YYYYMMDD}-{NNNN}` secuencial por caja/día |
| | Split tickets | 1 venta con múltiples `medios_pago_venta` |
| | Precio manual | 0.01 <= x <= 999999 para F/V/P/C |
| | FEFO integration | Auto-select lote más próximo a vencer |
| | Suma medios pago | `SUM(medios_pago.monto) >= total` |
| | Vuelto | Solo efectivo: `efectivo - total` |
| | Transaction | Serializable isolation level |
| **Devoluciones** | Retorno mismo lote | `lote_id` = lote original de `detalle_ventas` |
| | Cantidad disponible | `cantidad <= vendida - SUM(devoluciones_previas)` |
| | Parciales múltiples | Query SUM para validar cada devolución |
| | Monto devuelto | `(total / cantidad) * cantidad_devolver` |
| **Cajas** | Número único | Validar `numero` único antes de create/update |
| | Soft delete block | No desactivar si tiene ventas del día |
| **MovimientosCaja** | Tipos válidos | `gasto` \| `retiro` |
| | Solo admin panel | NO desde POS |
| **CierresCaja** | Cierre único | `UNIQUE (caja_id, fecha)` |
| | Diferencia efectivo | `fisico - sistema` → notificación si != 0 |
| | Motivo requerido | Si diferencia != 0, `motivo_diferencia` REQUIRED |
| | Efectivo sistema | `efectivo_ventas - gastos - retiros` |

---

## DATABASE INDEXES VALIDATION

```sql
-- Validar que estos indexes existan en el schema

-- ventas
CREATE INDEX idx_ventas_numero ON ventas(numero_ticket);
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_caja ON ventas(caja_id);
CREATE INDEX idx_ventas_transaccion ON ventas(transaccion_id) WHERE transaccion_id IS NOT NULL;
CREATE INDEX idx_ventas_no_anuladas ON ventas(anulada) WHERE anulada = false;

-- medios_pago_venta
CREATE INDEX idx_medios_pago_venta ON medios_pago_venta(venta_id);
CREATE INDEX idx_medios_pago_transaccion ON medios_pago_venta(transaccion_id) WHERE transaccion_id IS NOT NULL;
CREATE INDEX idx_medios_pago_tipo ON medios_pago_venta(medio_pago);

-- detalle_ventas
CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);
CREATE INDEX idx_detalle_lote ON detalle_ventas(lote_id) WHERE lote_id IS NOT NULL;
CREATE INDEX idx_detalle_promocion ON detalle_ventas(promocion_id) WHERE promocion_id IS NOT NULL;

-- devoluciones
CREATE INDEX idx_devoluciones_venta ON devoluciones(venta_id);
CREATE INDEX idx_devoluciones_producto ON devoluciones(producto_id);
CREATE INDEX idx_devoluciones_fecha ON devoluciones(fecha DESC);
CREATE INDEX idx_devoluciones_tipo ON devoluciones(tipo_devolucion);

-- cierres_caja
CREATE INDEX idx_cierres_caja ON cierres_caja(caja_id);
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha DESC);
CREATE UNIQUE INDEX uq_cierre_caja_fecha ON cierres_caja(caja_id, fecha);

-- movimientos_caja
CREATE INDEX idx_movimientos_caja_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(fecha DESC);
CREATE INDEX idx_movimientos_caja_usuario ON movimientos_caja(usuario_id);
```

---

## EVENTS TO EMIT

```typescript
// Sales events
export class SaleCompletedEvent {
  constructor(public readonly ventaId: string) {}
}

export class SaleCancelledEvent {
  constructor(
    public readonly ventaId: string, 
    public readonly motivo: string
  ) {}
}

export class StockInsufficientEvent {
  constructor(
    public readonly productoId: string, 
    public readonly cantidadRequerida: number,
    public readonly cantidadDisponible: number
  ) {}
}

// Devoluciones events
export class DevolucionCreatedEvent {
  constructor(public readonly devolucionId: string) {}
}

// Cierres events
export class CierreCajaCreatedEvent {
  constructor(public readonly cierreId: string) {}
}

export class DiferenciaEfectivoDetectedEvent {
  constructor(
    public readonly cierreId: string, 
    public readonly diferencia: number
  ) {}
}

// Movimientos events
export class MovimientoCajaCreatedEvent {
  constructor(
    public readonly movimientoId: string, 
    public readonly tipo: string
  ) {}
}
```

---

## END OF SPEC_04_SALES_OPERATIONS

**Next Steps:**
1. Implement SalesModule (CRITICAL - highest priority)
2. Implement DevolucionesModule (depends on Sales)
3. Implement CajasModule (simple CRUD)
4. Implement MovimientosCajaModule (simple)
5. Implement CierresCajaModule (depends on Sales + MovimientosCaja)
6. Run tests for each module before moving to next
7. Verify 90% coverage requirement

**Total Lines:** ~1500 lines  
**Total Modules:** 5  
**Total Endpoints:** 22  
**Total Tests:** 52 critical test cases  
**Transaction Isolation:** Serializable (Sales), ReadCommitted (Devoluciones, Cierres)
