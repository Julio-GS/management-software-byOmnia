# SPEC_01_MASTER_DATA - Backend Refactor
## UnidadesMedidaModule, ProveedoresModule, RubrosModule

**Project:** management-software-byomnia  
**Phase:** SPEC (Specifications)  
**Modules:** 3 Master Data Modules  
**Approach:** Clean Slate  
**Dependencies:** SharedModule, AuthModule

---

## TABLE OF CONTENTS

1. [UnidadesMedidaModule](#1-unidadesmedidam-odule)
   - API Contracts
   - DTOs
   - Business Rules
   - Repository Queries
   - Tests
   - Guards

2. [ProveedoresModule](#2-proveedoresmodule)
   - API Contracts
   - DTOs
   - Business Rules
   - Repository Queries
   - Tests
   - Guards

3. [RubrosModule](#3-rubrosmodule)
   - API Contracts
   - DTOs
   - Business Rules (Jerarquía 2 niveles)
   - Repository Queries
   - Tests
   - Guards

---

## 1. UNIDADESMEDIDAM-ODULE

### 1.1 API Contracts

```typescript
// GET /unidades-medida?tipo=peso&activo=true
// GET /unidades-medida/:id
// POST /unidades-medida
// PATCH /unidades-medida/:id
// DELETE /unidades-medida/:id (soft delete → activo=false)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 1.2 Key DTOs

```typescript
// create-unidad-medida.dto.ts
export class CreateUnidadMedidaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre: string; // "Kilogramo"

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  abreviatura: string; // "kg"

  @IsOptional()
  @IsIn(['peso', 'volumen', 'unidad', 'longitud'])
  tipo?: string; // Enum en DB: peso, volumen, unidad, longitud
}

// update-unidad-medida.dto.ts
export class UpdateUnidadMedidaDto extends PartialType(CreateUnidadMedidaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// query-unidad-medida.dto.ts
export class QueryUnidadMedidaDto {
  @IsOptional()
  @IsIn(['peso', 'volumen', 'unidad', 'longitud'])
  tipo?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

### 1.3 Business Rules

- **Unicidad:** `nombre` único (case-insensitive)
- **Tipos válidos:** peso, volumen, unidad, longitud (enum)
- **Soft delete:** No eliminar físicamente, marcar `activo = false`
- **Restricción FK:** No permitir desactivar si tiene productos asociados activos
- **Defaults:** `activo = true`, `tipo = null` (opcional)

### 1.4 Repository Queries

```typescript
// unidades-medida.repository.ts

// GET all (con filtros)
async findAll(query: QueryUnidadMedidaDto) {
  return prisma.unidades_medida.findMany({
    where: {
      tipo: query.tipo,
      activo: query.activo ?? true,
    },
    orderBy: { nombre: 'asc' },
  });
}

// GET by ID
async findById(id: string) {
  const unidad = await prisma.unidades_medida.findUnique({
    where: { id },
    include: { productos: { select: { id: true } } },
  });
  if (!unidad) throw new NotFoundException('Unidad de medida no encontrada');
  return unidad;
}

// POST create
async create(dto: CreateUnidadMedidaDto) {
  // Validar nombre único (case-insensitive)
  const exists = await prisma.unidades_medida.findFirst({
    where: {
      nombre: { equals: dto.nombre, mode: 'insensitive' },
    },
  });
  if (exists) throw new ConflictException('Nombre ya existe');

  return prisma.unidades_medida.create({ data: dto });
}

// PATCH update
async update(id: string, dto: UpdateUnidadMedidaDto) {
  await this.findById(id); // Validar existencia

  // Si cambia nombre, validar unicidad
  if (dto.nombre) {
    const duplicate = await prisma.unidades_medida.findFirst({
      where: {
        nombre: { equals: dto.nombre, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) throw new ConflictException('Nombre ya existe');
  }

  return prisma.unidades_medida.update({
    where: { id },
    data: dto,
  });
}

// DELETE soft delete
async softDelete(id: string) {
  const unidad = await this.findById(id);

  // Validar que no tenga productos activos
  const productosActivos = await prisma.productos.count({
    where: { unidad_medida_id: id, activo: true },
  });
  if (productosActivos > 0) {
    throw new ConflictException(
      `No se puede desactivar: ${productosActivos} productos activos asociados`
    );
  }

  return prisma.unidades_medida.update({
    where: { id },
    data: { activo: false },
  });
}
```

### 1.5 Critical Tests

```typescript
describe('UnidadesMedidaService', () => {
  // ✅ GET all - filters by tipo
  it('should return only "peso" units when tipo=peso', async () => {
    // Given: DB has kg (peso), litro (volumen), unidad (unidad)
    // When: findAll({ tipo: 'peso' })
    // Then: returns [kg], length === 1
  });

  // ✅ POST create - duplicate name case-insensitive
  it('should reject duplicate name "Kilogramo" vs "KILOGRAMO"', async () => {
    // Given: "Kilogramo" exists
    // When: create({ nombre: "KILOGRAMO" })
    // Then: throw ConflictException
  });

  // ✅ DELETE soft delete - block if productos activos
  it('should block soft delete if productos activos exist', async () => {
    // Given: unidad "kg" has 5 productos activos
    // When: softDelete(kg.id)
    // Then: throw ConflictException "5 productos activos asociados"
  });

  // ✅ DELETE soft delete - allow if only productos inactivos
  it('should allow soft delete if only productos inactivos', async () => {
    // Given: unidad "kg" has 3 productos inactivos
    // When: softDelete(kg.id)
    // Then: unidad.activo = false, success
  });
});
```

### 1.6 Guards

```typescript
// unidades-medida.controller.ts
@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryUnidadMedidaDto) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreateUnidadMedidaDto) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateUnidadMedidaDto) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  softDelete(@Param('id') id: string) { }
}
```

---

## 2. PROVEEDORESMODULE

### 2.1 API Contracts

```typescript
// GET /proveedores?search=coca&activo=true
// GET /proveedores/:id
// POST /proveedores
// PATCH /proveedores/:id
// DELETE /proveedores/:id (soft delete)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 2.2 Key DTOs

```typescript
// create-proveedor.dto.ts
export class CreateProveedorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre: string; // "Coca Cola FEMSA"

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string; // "Coca Cola FEMSA S.A."

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}-\d{8}-\d{1}$/, { message: 'CUIT inválido (formato: XX-XXXXXXXX-X)' })
  cuit?: string; // "30-12345678-9" - ÚNICO

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contacto?: string; // "Juan Pérez - Gerente Comercial"

  @IsOptional()
  @IsString()
  notas?: string;
}

// update-proveedor.dto.ts
export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// query-proveedor.dto.ts
export class QueryProveedorDto {
  @IsOptional()
  @IsString()
  search?: string; // Busca en nombre (gin_trgm_ops index)

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

### 2.3 Business Rules

- **CUIT único:** Validar formato `XX-XXXXXXXX-X` y unicidad
- **Search:** Full-text con `gin_trgm_ops` en `nombre` (PostgreSQL trigram)
- **Soft delete:** `activo = false`, no eliminar físicamente
- **Restricción FK:** No desactivar si tiene productos activos
- **Defaults:** `activo = true`

### 2.4 Repository Queries

```typescript
// proveedores.repository.ts

// GET all (con search)
async findAll(query: QueryProveedorDto) {
  const where: any = { activo: query.activo ?? true };

  // Full-text search en nombre (trigram index)
  if (query.search) {
    where.nombre = { contains: query.search, mode: 'insensitive' };
  }

  return prisma.proveedores.findMany({
    where,
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      razon_social: true,
      cuit: true,
      telefono: true,
      email: true,
      contacto: true,
      activo: true,
      _count: { select: { productos: true } },
    },
  });
}

// GET by ID
async findById(id: string) {
  const proveedor = await prisma.proveedores.findUnique({
    where: { id },
    include: {
      productos: {
        where: { activo: true },
        select: { id: true, codigo: true, detalle: true },
        take: 10,
      },
    },
  });
  if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
  return proveedor;
}

// POST create
async create(dto: CreateProveedorDto) {
  // Validar CUIT único si provisto
  if (dto.cuit) {
    const exists = await prisma.proveedores.findUnique({
      where: { cuit: dto.cuit },
    });
    if (exists) throw new ConflictException('CUIT ya registrado');
  }

  return prisma.proveedores.create({ data: dto });
}

// PATCH update
async update(id: string, dto: UpdateProveedorDto) {
  await this.findById(id);

  // Si cambia CUIT, validar unicidad
  if (dto.cuit) {
    const duplicate = await prisma.proveedores.findFirst({
      where: { cuit: dto.cuit, id: { not: id } },
    });
    if (duplicate) throw new ConflictException('CUIT ya registrado');
  }

  return prisma.proveedores.update({
    where: { id },
    data: { ...dto, updated_at: new Date() },
  });
}

// DELETE soft delete
async softDelete(id: string) {
  const proveedor = await this.findById(id);

  // Validar que no tenga productos activos
  const productosActivos = await prisma.productos.count({
    where: { proveedor_id: id, activo: true },
  });
  if (productosActivos > 0) {
    throw new ConflictException(
      `No se puede desactivar: ${productosActivos} productos activos asociados`
    );
  }

  return prisma.proveedores.update({
    where: { id },
    data: { activo: false, updated_at: new Date() },
  });
}
```

### 2.5 Critical Tests

```typescript
describe('ProveedoresService', () => {
  // ✅ POST create - CUIT único
  it('should reject duplicate CUIT', async () => {
    // Given: proveedor exists with cuit "30-12345678-9"
    // When: create({ cuit: "30-12345678-9" })
    // Then: throw ConflictException "CUIT ya registrado"
  });

  // ✅ POST create - CUIT formato inválido
  it('should reject invalid CUIT format', async () => {
    // When: create({ cuit: "1234567890" })
    // Then: throw ValidationError "CUIT inválido"
  });

  // ✅ GET all - search by nombre (trigram)
  it('should search "coca" and return "Coca Cola FEMSA"', async () => {
    // Given: DB has ["Coca Cola FEMSA", "Arcor", "Molinos"]
    // When: findAll({ search: "coca" })
    // Then: returns [Coca Cola FEMSA], length === 1
  });

  // ✅ DELETE soft delete - block if productos activos
  it('should block soft delete if productos activos exist', async () => {
    // Given: proveedor has 10 productos activos
    // When: softDelete(id)
    // Then: throw ConflictException "10 productos activos asociados"
  });
});
```

### 2.6 Guards

```typescript
@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryProveedorDto) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreateProveedorDto) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  softDelete(@Param('id') id: string) { }
}
```

---

## 3. RUBROSMODULE

### 3.1 API Contracts

```typescript
// GET /rubros?nivel=1&activo=true
// GET /rubros/:id
// GET /rubros/:id/hijos (rubros nivel 2)
// POST /rubros
// PATCH /rubros/:id
// DELETE /rubros/:id (soft delete)
```

**Roles:**
- `GET`: cajero, encargado, admin
- `POST/PATCH/DELETE`: encargado, admin

### 3.2 Key DTOs

```typescript
// create-rubro.dto.ts
export class CreateRubroDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string; // "Lácteos"

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string; // "LAC" - ÚNICO

  @IsOptional()
  @IsUUID()
  parent_id?: string; // Solo para nivel 2

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  default_markup?: number; // 35 = 35% markup por defecto
}

// update-rubro.dto.ts
export class UpdateRubroDto extends PartialType(CreateRubroDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// query-rubro.dto.ts
export class QueryRubroDto {
  @IsOptional()
  @IsIn([1, 2])
  @Type(() => Number)
  nivel?: number; // Filtrar por nivel jerárquico

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

### 3.3 Business Rules (Jerarquía 2 niveles)

- **Jerarquía:** Máximo 2 niveles (nivel 1 = padre, nivel 2 = hijo)
  - Nivel 1: `parent_id = null`, `nivel = 1`
  - Nivel 2: `parent_id != null`, `nivel = 2`
- **Validación:** No permitir `nivel = 3` (máximo 2 niveles)
- **Código único:** Opcional, pero si provisto debe ser único
- **Default markup:** Porcentaje de markup por defecto para productos (0-200)
- **Soft delete:** `activo = false`
- **Restricción FK:** 
  - No desactivar si tiene productos activos
  - No desactivar rubro nivel 1 si tiene hijos activos
- **Cascada:** Al actualizar `parent_id`, recalcular `nivel` automáticamente

### 3.4 Repository Queries

```typescript
// rubros.repository.ts

// GET all (con filtros)
async findAll(query: QueryRubroDto) {
  return prisma.rubros.findMany({
    where: {
      nivel: query.nivel,
      activo: query.activo ?? true,
    },
    include: {
      rubros: query.nivel === 1, // Incluir hijos si nivel=1 (padres)
      _count: { select: { productos: true } },
    },
    orderBy: [{ nivel: 'asc' }, { nombre: 'asc' }],
  });
}

// GET by ID con hijos
async findById(id: string) {
  const rubro = await prisma.rubros.findUnique({
    where: { id },
    include: {
      rubros: true, // Hijos (si nivel 1)
      other_rubros: true, // Padre (si nivel 2)
      productos: {
        where: { activo: true },
        select: { id: true, codigo: true, detalle: true },
        take: 10,
      },
    },
  });
  if (!rubro) throw new NotFoundException('Rubro no encontrado');
  return rubro;
}

// GET hijos de un rubro nivel 1
async findHijos(parentId: string) {
  const parent = await this.findById(parentId);
  if (parent.nivel !== 1) {
    throw new BadRequestException('Solo rubros nivel 1 tienen hijos');
  }

  return prisma.rubros.findMany({
    where: { parent_id: parentId, activo: true },
    orderBy: { nombre: 'asc' },
  });
}

// POST create
async create(dto: CreateRubroDto) {
  // Validar código único si provisto
  if (dto.codigo) {
    const exists = await prisma.rubros.findUnique({
      where: { codigo: dto.codigo },
    });
    if (exists) throw new ConflictException('Código ya existe');
  }

  // Calcular nivel automáticamente
  let nivel = 1;
  if (dto.parent_id) {
    const parent = await this.findById(dto.parent_id);
    if (parent.nivel === 2) {
      throw new BadRequestException('Máximo 2 niveles permitidos');
    }
    nivel = 2;
  }

  return prisma.rubros.create({
    data: { ...dto, nivel },
  });
}

// PATCH update
async update(id: string, dto: UpdateRubroDto) {
  const rubro = await this.findById(id);

  // Si cambia parent_id, recalcular nivel
  let nivel = rubro.nivel;
  if (dto.parent_id !== undefined) {
    if (dto.parent_id === null) {
      nivel = 1;
    } else {
      const parent = await this.findById(dto.parent_id);
      if (parent.nivel === 2) {
        throw new BadRequestException('Máximo 2 niveles permitidos');
      }
      nivel = 2;
    }
  }

  // Si cambia código, validar unicidad
  if (dto.codigo) {
    const duplicate = await prisma.rubros.findFirst({
      where: { codigo: dto.codigo, id: { not: id } },
    });
    if (duplicate) throw new ConflictException('Código ya existe');
  }

  return prisma.rubros.update({
    where: { id },
    data: { ...dto, nivel, updated_at: new Date() },
  });
}

// DELETE soft delete
async softDelete(id: string) {
  const rubro = await this.findById(id);

  // Validar que no tenga productos activos
  const productosActivos = await prisma.productos.count({
    where: { rubro_id: id, activo: true },
  });
  if (productosActivos > 0) {
    throw new ConflictException(
      `No se puede desactivar: ${productosActivos} productos activos asociados`
    );
  }

  // Si nivel 1, validar que no tenga hijos activos
  if (rubro.nivel === 1) {
    const hijosActivos = await prisma.rubros.count({
      where: { parent_id: id, activo: true },
    });
    if (hijosActivos > 0) {
      throw new ConflictException(
        `No se puede desactivar: ${hijosActivos} rubros hijos activos`
      );
    }
  }

  return prisma.rubros.update({
    where: { id },
    data: { activo: false, updated_at: new Date() },
  });
}
```

### 3.5 Critical Queries

```typescript
// Query compleja: Obtener rubros nivel 1 con conteo de productos totales (incluyendo hijos)
async getRubrosConProductosTotales() {
  return prisma.$queryRaw`
    SELECT 
      r1.id,
      r1.nombre,
      r1.default_markup,
      COUNT(DISTINCT p.id) FILTER (WHERE p.activo = true) AS productos_directos,
      COUNT(DISTINCT p2.id) FILTER (WHERE p2.activo = true) AS productos_hijos,
      COUNT(DISTINCT p.id) FILTER (WHERE p.activo = true) + 
        COUNT(DISTINCT p2.id) FILTER (WHERE p2.activo = true) AS productos_totales
    FROM rubros r1
    LEFT JOIN productos p ON p.rubro_id = r1.id
    LEFT JOIN rubros r2 ON r2.parent_id = r1.id
    LEFT JOIN productos p2 ON p2.rubro_id = r2.id
    WHERE r1.nivel = 1 AND r1.activo = true
    GROUP BY r1.id, r1.nombre, r1.default_markup
    ORDER BY r1.nombre ASC
  `;
}
```

### 3.6 Critical Tests

```typescript
describe('RubrosService', () => {
  // ✅ POST create - nivel calculado automáticamente
  it('should create nivel=1 when parent_id is null', async () => {
    // When: create({ nombre: "Lácteos", parent_id: null })
    // Then: rubro.nivel === 1
  });

  it('should create nivel=2 when parent_id is valid', async () => {
    // Given: rubro "Lácteos" exists (nivel 1)
    // When: create({ nombre: "Quesos", parent_id: lacteos.id })
    // Then: rubro.nivel === 2, parent_id === lacteos.id
  });

  // ✅ POST create - block nivel 3
  it('should reject nivel=3 (max 2 levels)', async () => {
    // Given: "Lácteos" (nivel 1) > "Quesos" (nivel 2)
    // When: create({ nombre: "Queso Azul", parent_id: quesos.id })
    // Then: throw BadRequestException "Máximo 2 niveles permitidos"
  });

  // ✅ PATCH update - recalcular nivel al cambiar parent_id
  it('should update nivel when parent_id changes', async () => {
    // Given: "Quesos" (nivel 2, parent_id = lacteos.id)
    // When: update(quesos.id, { parent_id: null })
    // Then: quesos.nivel === 1, parent_id === null
  });

  // ✅ DELETE soft delete - block if hijos activos
  it('should block soft delete nivel 1 if hijos activos', async () => {
    // Given: "Lácteos" (nivel 1) has "Quesos" (nivel 2, activo=true)
    // When: softDelete(lacteos.id)
    // Then: throw ConflictException "1 rubros hijos activos"
  });

  // ✅ GET hijos - only for nivel 1
  it('should return hijos for nivel 1', async () => {
    // Given: "Lácteos" (nivel 1) has ["Quesos", "Yogures"] (nivel 2)
    // When: findHijos(lacteos.id)
    // Then: returns [Quesos, Yogures], length === 2
  });

  it('should reject findHijos for nivel 2', async () => {
    // Given: "Quesos" (nivel 2)
    // When: findHijos(quesos.id)
    // Then: throw BadRequestException "Solo rubros nivel 1 tienen hijos"
  });
});
```

### 3.7 Guards

```typescript
@Controller('rubros')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RubrosController {
  @Get()
  @Roles('cajero', 'encargado', 'admin')
  findAll(@Query() query: QueryRubroDto) { }

  @Get(':id/hijos')
  @Roles('cajero', 'encargado', 'admin')
  findHijos(@Param('id') id: string) { }

  @Post()
  @Roles('encargado', 'admin')
  create(@Body() dto: CreateRubroDto) { }

  @Patch(':id')
  @Roles('encargado', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateRubroDto) { }

  @Delete(':id')
  @Roles('encargado', 'admin')
  softDelete(@Param('id') id: string) { }
}
```

---

## IMPLEMENTATION CHECKLIST

### UnidadesMedidaModule
- [ ] `unidades-medida.module.ts` (imports, providers, exports)
- [ ] `unidades-medida.controller.ts` (5 endpoints + guards)
- [ ] `unidades-medida.service.ts` (business logic + FK validations)
- [ ] `unidades-medida.repository.ts` (5 Prisma queries)
- [ ] `dto/create-unidad-medida.dto.ts` (3 fields + validators)
- [ ] `dto/update-unidad-medida.dto.ts` (extends PartialType + activo)
- [ ] `dto/query-unidad-medida.dto.ts` (tipo, activo filters)
- [ ] `__tests__/unidades-medida.service.spec.ts` (4 tests)
- [ ] `__tests__/unidades-medida.e2e-spec.ts` (5 endpoints)

### ProveedoresModule
- [ ] `proveedores.module.ts`
- [ ] `proveedores.controller.ts` (5 endpoints + guards)
- [ ] `proveedores.service.ts` (business logic + CUIT validation)
- [ ] `proveedores.repository.ts` (5 Prisma queries + trigram search)
- [ ] `dto/create-proveedor.dto.ts` (8 fields + CUIT regex)
- [ ] `dto/update-proveedor.dto.ts` (extends PartialType + activo)
- [ ] `dto/query-proveedor.dto.ts` (search, activo filters)
- [ ] `__tests__/proveedores.service.spec.ts` (4 tests)
- [ ] `__tests__/proveedores.e2e-spec.ts` (5 endpoints)

### RubrosModule
- [ ] `rubros.module.ts`
- [ ] `rubros.controller.ts` (6 endpoints + guards)
- [ ] `rubros.service.ts` (business logic + nivel auto-calc)
- [ ] `rubros.repository.ts` (6 Prisma queries + 1 raw SQL)
- [ ] `dto/create-rubro.dto.ts` (5 fields + validators)
- [ ] `dto/update-rubro.dto.ts` (extends PartialType + activo)
- [ ] `dto/query-rubro.dto.ts` (nivel, activo filters)
- [ ] `__tests__/rubros.service.spec.ts` (7 tests)
- [ ] `__tests__/rubros.e2e-spec.ts` (6 endpoints)

---

## BUSINESS RULES SUMMARY

| Module | Key Rule | Validation |
|--------|----------|------------|
| **UnidadesMedida** | Tipo enum | `peso \| volumen \| unidad \| longitud` |
| | Soft delete block | Count productos activos > 0 → reject |
| | Nombre único | Case-insensitive check |
| **Proveedores** | CUIT único | Regex `/^\d{2}-\d{8}-\d{1}$/` |
| | Search trigram | `gin_trgm_ops` index on `nombre` |
| | Soft delete block | Count productos activos > 0 → reject |
| **Rubros** | Jerarquía 2 niveles | nivel 1 (parent_id=null), nivel 2 (parent_id!=null) |
| | Nivel auto-calc | Based on parent_id existence |
| | Soft delete block | Count productos activos > 0 OR hijos activos > 0 → reject |
| | Default markup | 0-200% (applied to productos) |

---

## DATABASE INDEXES VALIDATION

```sql
-- Validar que estos indexes existan en el schema

-- proveedores
CREATE INDEX idx_proveedores_nombre ON proveedores USING gin(nombre gin_trgm_ops);

-- rubros
CREATE INDEX idx_rubros_nivel ON rubros(nivel);
CREATE INDEX idx_rubros_nombre ON rubros(nombre);

-- unidades_medida (no requiere indexes adicionales)
```

---

## END OF SPEC_01_MASTER_DATA

**Next Steps:**
1. Implement SharedModule first (validators, exceptions, interceptors)
2. Implement AuthModule (JWT username-based)
3. Implement these 3 modules in order: UnidadesMedida → Proveedores → Rubros
4. Run tests for each module before moving to next
5. Continue with SPEC_02_PRODUCTS_INVENTORY.md

**Total Lines:** ~800 lines  
**Total Modules:** 3  
**Total Endpoints:** 16  
**Total Tests:** 15 critical test cases
