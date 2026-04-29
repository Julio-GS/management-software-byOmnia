# Documentación - Base de Datos Supermercado

## Resumen Ejecutivo

Esta base de datos está diseñada para un sistema completo de gestión de supermercado con énfasis en:
- Inventario y control de stock en tiempo real
- Trazabilidad de lotes y vencimientos
- Historial completo de cambios de precios
- Sistema POS (Punto de Venta)
- Promociones y ofertas especiales

## Estructura General

### Tablas Maestras (Catálogos)
1. **proveedores** - Proveedores de mercadería
2. **rubros** - Categorías de productos
3. **unidades_medida** - Unidades de medición (kg, lt, un, etc.)

### Tabla Principal
4. **productos** - Catálogo completo de productos con toda su información

### Control de Inventario
5. **lotes** - Gestión de lotes por producto con vencimientos
6. **movimientos_stock** - Registro de todos los movimientos (entradas, salidas, ajustes)

### Auditoría
7. **precios_historico** - Historial automático de cambios de precios y costos

### Promociones
8. **promociones** - Definición de ofertas y promociones
9. **promociones_productos** - Relación de productos incluidos en cada promoción

### Ventas (POS)
10. **ventas** - Tickets de venta
11. **detalle_ventas** - Líneas de cada ticket

---

## Descripción Detallada de Tablas

### 1. productos

**Propósito**: Catálogo maestro de todos los productos del supermercado.

**Campos Clave**:
- `codigo`: Código único del producto (del archivo original)
- `codigo_alternativo`: Código secundario/interno
- `codigo_barras`: Código de barras EAN-13/UPC
- `detalle`: Descripción del producto
- `pesable`: Si el producto se vende por peso
- `requiere_balanza`: Si necesita pesarse en balanza al vender
- `plu_balanza`: Código PLU para balanzas electrónicas
- `costo_neto` / `costo_final`: Costos sin/con impuestos
- `precio_venta`: Precio de venta al público
- `maneja_stock`: Si controla inventario

**Características Especiales**:
- Soporte completo para productos pesables (frutas, verduras, fiambres)
- Sistema de impuestos flexible con alícuota de IVA configurable
- Campos de auditoría automática (created_at, updated_at)
- Validaciones de integridad (precios positivos, consistencia pesable-peso)

**Índices**:
- Búsqueda rápida por código, código de barras
- Búsqueda de texto en descripción (usando pg_trgm)
- Filtros por proveedor, rubro, activo

---

### 2. lotes

**Propósito**: Control de vencimientos y trazabilidad FEFO (First Expired First Out).

**Campos Clave**:
- `numero_lote`: Identificador del lote del proveedor
- `fecha_vencimiento`: Fecha de vencimiento del lote
- `cantidad_inicial` / `cantidad_actual`: Stock del lote
- `costo_unitario`: Costo de compra de este lote específico
- `fecha_ingreso`: Cuándo ingresó el lote

**Casos de Uso**:
1. **Productos con vencimiento**: lácteos, embutidos, medicamentos
2. **Productos sin vencimiento pero con lotes**: para trazabilidad
3. **Costeo PEPS**: cada lote tiene su propio costo

**Funcionalidad**:
- Al vender, se registra de qué lote salió el producto
- Alertas automáticas de productos próximos a vencer (vista `v_productos_proximos_vencer`)
- Stock se actualiza automáticamente con trigger

---

### 3. movimientos_stock

**Propósito**: Registro completo de todo lo que entra y sale del inventario.

**Tipos de Movimientos**:
- `entrada`: Compra a proveedor
- `salida`: Venta o consumo
- `ajuste_positivo` / `ajuste_negativo`: Correcciones de inventario
- `venta`: Salida por venta (automático)
- `devolucion`: Devolución de cliente
- `merma`: Pérdida por rotura, deterioro
- `vencimiento`: Baja por vencimiento

**Características**:
- Trazabilidad completa: quién, cuándo, por qué
- Referencia a tickets de venta
- Referencia a lotes específicos
- Trigger automático actualiza stock del lote

---

### 4. precios_historico

**Propósito**: Auditoría automática de todos los cambios de precio.

**Funciona Automáticamente**:
- Trigger se dispara cada vez que se modifica precio_venta o costo_final en productos
- Registra valores anteriores y nuevos
- Calcula porcentaje de variación
- Registra usuario que hizo el cambio

**Casos de Uso**:
1. Análisis de evolución de precios
2. Auditoría para inflación/deflación
3. Reportes regulatorios
4. Análisis de márgenes históricos

---

### 5. promociones

**Propósito**: Sistema flexible de ofertas y promociones.

**Tipos Soportados**:
1. **descuento_porcentual**: Ej: 15% OFF
2. **descuento_monto**: Ej: $500 de descuento
3. **cantidad_por_cantidad**: Ej: 2x1, 3x2, Llevando 6 paga 4
4. **precio_especial**: Ej: Precio fijo promocional $999

**Características Avanzadas**:
- Vigencia por fechas
- Vigencia por días de semana (ej: solo sábados)
- Vigencia por horario (ej: happy hour)
- Límite por cliente
- Stock dedicado a la promoción
- Prioridad para resolver conflictos

**Ejemplo de Uso**:
```sql
-- Promoción 2x1 en cervezas, solo viernes y sábados
INSERT INTO promociones (
    nombre, tipo, 
    cantidad_requerida, cantidad_bonificada,
    fecha_inicio, fecha_fin,
    dias_semana
) VALUES (
    '2x1 en Cervezas', 
    'cantidad_por_cantidad',
    2, 1,  -- Lleva 2, paga 1
    '2026-04-01', '2026-04-30',
    ARRAY[5, 6]  -- Viernes=5, Sábado=6
);
```

---

### 6. ventas y detalle_ventas

**Propósito**: Sistema POS completo.

**Tabla ventas** (cabecera del ticket):
- Número de ticket único
- Totales calculados (subtotal, descuentos, impuestos, total)
- Medio de pago
- Usuario/cajero
- Posibilidad de anular ventas

**Tabla detalle_ventas** (líneas del ticket):
- Cantidad vendida
- Precio unitario (al momento de la venta)
- Descuentos aplicados
- Trazabilidad al lote vendido
- Promoción aplicada (si corresponde)

**Características**:
- Constraint automático verifica que total = subtotal - descuentos + impuestos
- Al insertar detalle, se genera automáticamente un movimiento_stock
- Registro de IVA por ítem

---

## Funcionalidades Automáticas (Triggers)

### 1. updated_at automático
Todas las tablas maestras actualizan su campo `updated_at` automáticamente al modificarse.

### 2. Historial de precios automático
Cada cambio en `productos.precio_venta` o `productos.costo_final` genera un registro en `precios_historico`.

### 3. Actualización de stock
Cada inserción en `movimientos_stock` actualiza automáticamente `lotes.cantidad_actual`.

---

## Vistas Útiles

### v_stock_actual
Muestra el stock consolidado por producto:
```sql
SELECT * FROM v_stock_actual 
WHERE stock_total < 10  -- Productos con bajo stock
ORDER BY stock_total ASC;
```

### v_productos_proximos_vencer
Lista productos que vencen en los próximos 30 días:
```sql
SELECT * FROM v_productos_proximos_vencer
ORDER BY dias_hasta_vencimiento ASC;
```

### v_promociones_vigentes
Promociones activas en este momento:
```sql
SELECT * FROM v_promociones_vigentes;
```

### v_ventas_diarias
Resumen de ventas por día:
```sql
SELECT * FROM v_ventas_diarias
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days';
```

---

## Migración desde tu archivo ARTICULOS2.XLS

### Script de migración sugerido:

```sql
-- 1. Importar proveedores únicos
INSERT INTO proveedores (nombre)
SELECT DISTINCT 'Proveedor ' || proveedor::text
FROM articulos_temp
WHERE proveedor IS NOT NULL;

-- 2. Importar rubros únicos  
INSERT INTO rubros (nombre, codigo)
SELECT DISTINCT 'Rubro ' || rubro::text, 'R' || rubro::text
FROM articulos_temp
WHERE rubro IS NOT NULL;

-- 3. Importar productos
INSERT INTO productos (
    codigo,
    codigo_alternativo,
    detalle,
    pesable,
    requiere_balanza,
    plu_balanza,
    peso_unitario,
    proveedor_id,
    rubro_id,
    unidad_medida_id,
    costo_neto,
    costo_final,
    impuestos,
    alicuota_iva,
    precio_venta,
    etiquetar,
    mostrar_cartel,
    maneja_stock,
    facturable,
    es_servicio,
    contenido,
    coeficiente
)
SELECT 
    codigo,
    alternativ,
    COALESCE(detalle, 'Sin descripción'),
    pesable,
    balanza,
    NULLIF(plu::text, '0'),
    NULLIF(peso, 0),
    (SELECT id FROM proveedores WHERE nombre = 'Proveedor ' || a.proveedor::text LIMIT 1),
    (SELECT id FROM rubros WHERE codigo = 'R' || a.rubro::text LIMIT 1),
    (SELECT id FROM unidades_medida WHERE abreviatura = 'UN' LIMIT 1),
    COALESCE(costo_neto, 0),
    COALESCE(costofinal, 0),
    COALESCE(impuestos, 0),
    COALESCE(alicuota, 21),
    COALESCE(precio1fin, 0),
    etiquetar,
    cartel,
    maneja_stk,
    facturable,
    servicio,
    NULLIF(contenido, 0),
    NULLIF(coeficient, 0)
FROM articulos_temp a
WHERE codigo IS NOT NULL AND codigo != '_';
```

---

## Consultas Útiles

### Productos más vendidos (último mes)
```sql
SELECT 
    p.codigo,
    p.detalle,
    SUM(dv.cantidad) as unidades_vendidas,
    SUM(dv.total) as monto_total
FROM detalle_ventas dv
JOIN ventas v ON dv.venta_id = v.id
JOIN productos p ON dv.producto_id = p.id
WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
  AND v.anulada = false
GROUP BY p.id, p.codigo, p.detalle
ORDER BY monto_total DESC
LIMIT 20;
```

### Margen de ganancia por producto
```sql
SELECT 
    codigo,
    detalle,
    costo_final,
    precio_venta,
    precio_venta - costo_final as ganancia_bruta,
    ROUND(((precio_venta - costo_final) / NULLIF(precio_venta, 0) * 100)::numeric, 2) as margen_porcentaje
FROM productos
WHERE activo = true AND precio_venta > 0
ORDER BY margen_porcentaje DESC;
```

### Stock valorizado
```sql
SELECT 
    p.codigo,
    p.detalle,
    sa.stock_total,
    p.costo_final,
    sa.stock_total * p.costo_final as valor_stock
FROM v_stock_actual sa
JOIN productos p ON sa.producto_id = p.id
ORDER BY valor_stock DESC;
```

### Movimientos de un producto específico
```sql
SELECT 
    ms.tipo_movimiento,
    ms.cantidad,
    ms.fecha,
    ms.usuario,
    ms.observaciones,
    l.numero_lote
FROM movimientos_stock ms
LEFT JOIN lotes l ON ms.lote_id = l.id
WHERE ms.producto_id = 'UUID_DEL_PRODUCTO'
ORDER BY ms.fecha DESC
LIMIT 50;
```

---

## Índices de Performance

La base de datos incluye índices estratégicos para:

1. **Búsquedas frecuentes**: código de producto, código de barras
2. **Filtros comunes**: productos activos, stock disponible
3. **Búsqueda de texto**: descripción de productos (usando pg_trgm)
4. **Reportes**: ventas por fecha, movimientos por fecha
5. **Joins frecuentes**: relaciones FK

---

## Extensiones Futuras Sugeridas

Si necesitas expandir el sistema en el futuro, considera:

1. **Clientes y Fidelización**:
   - Tabla `clientes` con datos personales
   - Tabla `puntos_fidelidad`
   - Tabla `tarjetas_descuento`

2. **Múltiples Sucursales**:
   - Tabla `sucursales`
   - Agregar `sucursal_id` a productos, ventas, stock
   - Transferencias entre sucursales

3. **Proveedores Avanzado**:
   - Tabla `ordenes_compra`
   - Tabla `remitos`
   - Tabla `facturas_proveedor`

4. **Empleados**:
   - Tabla `empleados`
   - Tabla `turnos`
   - Tabla `comisiones`

5. **Reportes y BI**:
   - Tablas agregadas diarias/mensuales
   - Materialised views para performance

---

## Mantenimiento y Respaldos

### Respaldo diario recomendado:
```bash
pg_dump -U usuario -d supermercado -Fc > backup_$(date +%Y%m%d).dump
```

### Limpieza periódica:
```sql
-- Eliminar movimientos antiguos (más de 2 años)
DELETE FROM movimientos_stock 
WHERE fecha < CURRENT_DATE - INTERVAL '2 years';

-- Archivar ventas viejas en tabla histórica
-- (implementar según necesidad)
```

### Monitoreo de espacio:
```sql
-- Tamaño de cada tabla
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Notas Finales

Esta estructura está optimizada para:
- ✅ Control de stock en tiempo real
- ✅ Trazabilidad completa (lotes, vencimientos)
- ✅ Historial de precios automático
- ✅ Sistema POS funcional
- ✅ Promociones flexibles
- ✅ Productos pesables
- ✅ Auditoría completa

La base de datos utiliza UUID como primary keys para facilitar futuras integraciones, sincronizaciones y escalabilidad.
