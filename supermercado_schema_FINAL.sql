-- =====================================================
-- SCHEMA FINAL: Sistema de Gestión de Supermercado
-- PostgreSQL 12+
-- Versión: 2.0 - Rediseño completo basado en Q&A exhaustivo
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- =====================================================
-- TABLAS MAESTRAS (Catálogos)
-- =====================================================

-- Proveedores
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200),
    cuit VARCHAR(13) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(100),
    contacto VARCHAR(100),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proveedores_nombre ON proveedores USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_proveedores_activo ON proveedores(activo) WHERE activo = true;

COMMENT ON TABLE proveedores IS 'Catálogo de proveedores - relación 1:1 con productos, sin órdenes de compra';

-- Rubros (categorías de productos) - MODIFICADO: Soporte para jerarquía de 2 niveles
CREATE TABLE rubros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(20) UNIQUE,
    
    -- Jerarquía de 2 niveles (Bloque A)
    parent_id UUID REFERENCES rubros(id) ON DELETE RESTRICT,
    nivel INTEGER NOT NULL DEFAULT 1 CHECK (nivel IN (1, 2)),
    
    -- Pricing (Bloque D)
    default_markup DECIMAL(5,2) DEFAULT 0 CHECK (default_markup >= 0),
    
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: nivel 1 sin padre, nivel 2 con padre
    CONSTRAINT chk_rubros_jerarquia CHECK (
        (nivel = 1 AND parent_id IS NULL) OR 
        (nivel = 2 AND parent_id IS NOT NULL)
    )
);

CREATE INDEX idx_rubros_nombre ON rubros(nombre);
CREATE INDEX idx_rubros_parent ON rubros(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_rubros_nivel ON rubros(nivel);

COMMENT ON TABLE rubros IS 'Categorías de productos con jerarquía de 2 niveles (ej: Bebidas > Gaseosas)';
COMMENT ON COLUMN rubros.default_markup IS 'Markup sugerido por categoría (% sobre costo), ej: 30 = 30%';

-- Unidades de medida
CREATE TABLE unidades_medida (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL,
    abreviatura VARCHAR(10) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('peso', 'volumen', 'unidad', 'longitud')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_unidades_abreviatura ON unidades_medida(abreviatura) WHERE activo = true;

COMMENT ON TABLE unidades_medida IS 'Stock siempre en unidad mínima vendible, sin conversiones automáticas';

-- =====================================================
-- TABLA PRINCIPAL: PRODUCTOS
-- =====================================================

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    codigo VARCHAR(50) UNIQUE NOT NULL,
    codigo_alternativo VARCHAR(50),
    codigo_barras VARCHAR(50),
    detalle VARCHAR(500) NOT NULL,
    
    -- Clasificación
    proveedor_id UUID REFERENCES proveedores(id),
    rubro_id UUID REFERENCES rubros(id),
    unidad_medida_id UUID REFERENCES unidades_medida(id),
    
    -- Características físicas
    contenido DECIMAL(10,3), -- Contenido neto (ej: 500ml, 1kg)
    
    -- Códigos Especiales (Bloque A y B)
    es_codigo_especial BOOLEAN DEFAULT false, -- F, V, P, C
    requiere_precio_manual BOOLEAN DEFAULT false, -- Precio ingresado en POS
    
    -- Lotes y Vencimientos (Bloque C)
    maneja_lotes BOOLEAN DEFAULT false, -- Solo perecederos
    
    -- Costos (Bloque D - editable al cargar stock)
    costo DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Impuestos (Bloque D)
    iva DECIMAL(5,2) DEFAULT 21.00, -- IVA ya incluido en precio_venta
    
    -- Precio de venta (Bloque D - siempre manual, markup es solo sugerencia)
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Stock (Bloque H2)
    stock_minimo INTEGER DEFAULT 20, -- Umbral para alerta de stock bajo (editable)
    
    -- Configuración operativa
    maneja_stock BOOLEAN DEFAULT true,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_precios_positivos CHECK (
        costo >= 0 AND 
        precio_venta >= 0
    ),
    CONSTRAINT chk_codigo_especial CHECK (
        NOT es_codigo_especial OR requiere_precio_manual = true
    ),
    CONSTRAINT chk_iva_valido CHECK (iva >= 0 AND iva <= 100)
);

-- Índices para productos
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX idx_productos_detalle ON productos USING gin(detalle gin_trgm_ops);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_rubro ON productos(rubro_id);
CREATE INDEX idx_productos_activo ON productos(activo) WHERE activo = true;
CREATE INDEX idx_productos_especiales ON productos(es_codigo_especial) WHERE es_codigo_especial = true;
CREATE INDEX idx_productos_lotes ON productos(maneja_lotes) WHERE maneja_lotes = true;

COMMENT ON TABLE productos IS 'Catálogo principal de productos - ELIMINADO: requiere_balanza, plu_balanza, peso_unitario, coeficiente (no hay balanzas electrónicas ni conversiones)';
COMMENT ON COLUMN productos.es_codigo_especial IS 'Productos genéricos F/V/P/C que requieren precio manual en POS';
COMMENT ON COLUMN productos.maneja_lotes IS 'Solo TRUE para perecederos (lácteos, refrigerados, harinas, galletas)';
COMMENT ON COLUMN productos.costo IS 'Costo editable al cargar stock (no obligatorio actualizar siempre)';
COMMENT ON COLUMN productos.precio_venta IS 'Precio con IVA incluido, siempre manual (markup solo sugiere)';

-- =====================================================
-- HISTORIAL DE PRECIOS Y COSTOS
-- =====================================================

CREATE TABLE precios_historia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    -- Valores anteriores
    precio_anterior DECIMAL(12,2),
    costo_anterior DECIMAL(12,2),
    
    -- Valores nuevos
    precio_nuevo DECIMAL(12,2),
    costo_nuevo DECIMAL(12,2),
    
    -- Metadata del cambio (Bloque D4)
    usuario_id UUID, -- FK a usuarios (definida más abajo)
    motivo VARCHAR(500), -- Razón del cambio
    tipo_cambio VARCHAR(20) CHECK (tipo_cambio IN ('precio', 'costo', 'ambos')),
    porcentaje_variacion DECIMAL(8,2),
    
    -- Auditoría
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_precios_hist_producto ON precios_historia(producto_id);
CREATE INDEX idx_precios_hist_fecha ON precios_historia(fecha_cambio DESC);
CREATE INDEX idx_precios_hist_usuario ON precios_historia(usuario_id);

COMMENT ON TABLE precios_historia IS 'Historial de cambios de precio/costo - Propósito: auditoría Y estadísticas';

-- =====================================================
-- CONTROL DE LOTES Y VENCIMIENTOS (Simplificado)
-- =====================================================

CREATE TABLE lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    -- Identificación del lote (Bloque C)
    numero_lote VARCHAR(50) NOT NULL, -- Auto-generado si no provisto: LOTE-YYYYMMDD-NNN
    fecha_vencimiento DATE, -- Nullable para productos sin vencimiento
    
    -- Cantidades (simplificado - ELIMINADO: costo_unitario, fecha_produccion)
    cantidad_inicial INTEGER NOT NULL CHECK (cantidad_inicial > 0),
    cantidad_actual INTEGER NOT NULL CHECK (cantidad_actual >= 0),
    
    -- Fechas
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    CONSTRAINT chk_lote_cantidad CHECK (cantidad_actual <= cantidad_inicial),
    CONSTRAINT uq_producto_lote UNIQUE (producto_id, numero_lote)
);

CREATE INDEX idx_lotes_producto ON lotes(producto_id);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento) WHERE activo = true AND fecha_vencimiento IS NOT NULL;
CREATE INDEX idx_lotes_activo ON lotes(activo, producto_id) WHERE activo = true;

COMMENT ON TABLE lotes IS 'Lotes simplificados - Solo control de vencimientos, FEFO automático, alerta 15 días antes';
COMMENT ON COLUMN lotes.numero_lote IS 'Auto-generado si no provisto: LOTE-YYYYMMDD-NNN';
COMMENT ON COLUMN lotes.fecha_vencimiento IS 'Sistema alertará 15 días antes (email + in-app a gerente)';

-- =====================================================
-- MOVIMIENTOS DE STOCK
-- =====================================================

CREATE TABLE movimientos_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id),
    lote_id UUID REFERENCES lotes(id),
    
    -- Tipo de movimiento
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (
        tipo_movimiento IN (
            'entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo',
            'venta', 'devolucion', 'merma', 'vencimiento'
        )
    ),
    
    -- Cantidad
    cantidad INTEGER NOT NULL,
    
    -- Referencias
    referencia VARCHAR(100), -- Número de remito, ticket, etc.
    venta_id UUID, -- Referencia a la venta si es una salida por venta
    
    -- Metadata
    usuario_id UUID, -- FK a usuarios
    observaciones TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0)
);

CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_lote ON movimientos_stock(lote_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(fecha DESC);
CREATE INDEX idx_movimientos_venta ON movimientos_stock(venta_id) WHERE venta_id IS NOT NULL;

COMMENT ON TABLE movimientos_stock IS 'Inventario físico mensual (objetivo) con ajustes positivos/negativos';

-- =====================================================
-- PROMOCIONES Y OFERTAS
-- =====================================================

CREATE TABLE promociones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    
    -- Tipo de promoción (Bloque E - sin cross-promotions)
    tipo VARCHAR(30) NOT NULL CHECK (
        tipo IN (
            'descuento_porcentaje',  -- Ej: 20% de descuento
            'descuento_monto',        -- Ej: $500 de descuento
            '2x1',                    -- 2x1, 3x2, etc.
            'precio_especial'         -- Ej: Precio fijo promocional
        )
    ),
    
    -- Valores según tipo
    valor_descuento DECIMAL(12,2), -- Porcentaje o monto
    cantidad_requerida INTEGER,    -- Para 2x1: 2, para 3x2: 3
    cantidad_bonificada INTEGER,   -- Para 2x1: 1, para 3x2: 1
    precio_especial DECIMAL(12,2), -- Precio fijo promocional
    
    -- Vigencia (Bloque E2)
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_semana INTEGER[], -- Array de días: 0=Domingo, 1=Lunes, etc. NULL = todos los días
    hora_inicio TIME,      -- Para happy hour, etc.
    hora_fin TIME,
    
    -- Límites (Bloque E2)
    cantidad_maxima_cliente INTEGER, -- Cantidad máxima por cliente
    
    -- Acumulación (Bloque E1 - solo jubilados domingos puede acumular)
    acumulable BOOLEAN DEFAULT false,
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    prioridad INTEGER DEFAULT 0, -- Para resolver conflictos (más alto = preferencia)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_promocion_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_promocion_horarios CHECK (
        (hora_inicio IS NULL AND hora_fin IS NULL) OR
        (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL)
    ),
    CONSTRAINT chk_promocion_valores CHECK (
        (tipo = 'descuento_porcentaje' AND valor_descuento BETWEEN 0 AND 100) OR
        (tipo = 'descuento_monto' AND valor_descuento > 0) OR
        (tipo = '2x1' AND cantidad_requerida > 0 AND cantidad_bonificada > 0) OR
        (tipo = 'precio_especial' AND precio_especial > 0)
    )
);

CREATE INDEX idx_promociones_vigencia ON promociones(fecha_inicio, fecha_fin) WHERE activo = true;
CREATE INDEX idx_promociones_activo ON promociones(activo) WHERE activo = true;
CREATE INDEX idx_promociones_acumulable ON promociones(acumulable) WHERE acumulable = true;

COMMENT ON TABLE promociones IS 'Promociones auto-aplicadas, NO acumulables excepto jubilados 10% domingos';
COMMENT ON COLUMN promociones.acumulable IS 'Solo TRUE para promoción jubilados - es la única que se acumula con otras';
COMMENT ON COLUMN promociones.cantidad_maxima_cliente IS 'Máximo de productos en promoción por cliente';

-- Productos incluidos en cada promoción
CREATE TABLE promociones_productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promocion_id UUID NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    CONSTRAINT uq_promocion_producto UNIQUE (promocion_id, producto_id)
);

CREATE INDEX idx_promo_prod_promocion ON promociones_productos(promocion_id);
CREATE INDEX idx_promo_prod_producto ON promociones_productos(producto_id);

-- =====================================================
-- USUARIOS Y ROLES
-- =====================================================

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(200),
    email VARCHAR(100),
    
    -- Rol (Bloque G)
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('cajero', 'encargado', 'admin')),
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo) WHERE activo = true;

COMMENT ON TABLE usuarios IS 'Usuarios del sistema - 3 roles: cajero (POS + devoluciones), encargado (+ stock/precios), admin (todo)';
COMMENT ON COLUMN usuarios.rol IS 'cajero: POS/consultas/devoluciones | encargado: + stock/precios | admin: sin restricciones';

-- =====================================================
-- CAJAS (Terminales POS)
-- =====================================================

CREATE TABLE cajas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero INTEGER UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cajas_numero ON cajas(numero);
CREATE INDEX idx_cajas_activo ON cajas(activo) WHERE activo = true;

COMMENT ON TABLE cajas IS 'Terminales POS - Actualmente 2 cajas, cada una con cierre individual';

-- =====================================================
-- VENTAS
-- =====================================================

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    numero_ticket VARCHAR(50) UNIQUE NOT NULL,
    
    -- Transacción (Bloque casos complejos - split tickets)
    transaccion_id UUID, -- Agrupa múltiples tickets de la misma transacción
    
    -- Caja (Bloque F4)
    caja_id UUID NOT NULL REFERENCES cajas(id),
    
    -- Montos
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuentos DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Vuelto (solo para efectivo)
    vuelto DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    usuario_id UUID REFERENCES usuarios(id),
    observaciones TEXT,
    anulada BOOLEAN DEFAULT false,
    motivo_anulacion TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_anulacion TIMESTAMP,
    
    CONSTRAINT chk_venta_total CHECK (total = subtotal - descuentos),
    CONSTRAINT chk_vuelto_positivo CHECK (vuelto >= 0)
);

CREATE INDEX idx_ventas_numero ON ventas(numero_ticket);
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_caja ON ventas(caja_id);
CREATE INDEX idx_ventas_transaccion ON ventas(transaccion_id) WHERE transaccion_id IS NOT NULL;
CREATE INDEX idx_ventas_no_anuladas ON ventas(anulada) WHERE anulada = false;

COMMENT ON TABLE ventas IS 'Registro de ventas - ELIMINADO: medio_pago, monto_pagado (ahora en tabla separada para múltiples medios)';
COMMENT ON COLUMN ventas.transaccion_id IS 'Agrupa múltiples tickets de la misma transacción (split tickets)';

-- =====================================================
-- MEDIOS DE PAGO POR VENTA (Bloque casos complejos)
-- =====================================================

CREATE TABLE medios_pago_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    transaccion_id UUID, -- Para pagos de transacciones con split tickets
    
    -- Medio de pago
    medio_pago VARCHAR(30) NOT NULL CHECK (
        medio_pago IN ('efectivo', 'debito', 'credito', 'transferencia', 'qr')
    ),
    
    -- Monto
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    
    -- Metadata
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: debe tener venta_id O transaccion_id (o ambos)
    CONSTRAINT chk_medio_pago_referencia CHECK (
        venta_id IS NOT NULL OR transaccion_id IS NOT NULL
    )
);

CREATE INDEX idx_medios_pago_venta ON medios_pago_venta(venta_id);
CREATE INDEX idx_medios_pago_transaccion ON medios_pago_venta(transaccion_id) WHERE transaccion_id IS NOT NULL;
CREATE INDEX idx_medios_pago_tipo ON medios_pago_venta(medio_pago);

COMMENT ON TABLE medios_pago_venta IS 'Múltiples medios de pago por venta (ej: $1500 transferencia + $500 efectivo)';

-- =====================================================
-- DETALLE DE VENTAS
-- =====================================================

CREATE TABLE detalle_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    lote_id UUID REFERENCES lotes(id), -- Para trazabilidad (FEFO automático)
    promocion_id UUID REFERENCES promociones(id), -- Para tracking de efectividad (Bloque E5)
    
    -- Cantidad y precio (ELIMINADO: peso_vendido)
    cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    
    -- IVA (informativo, ya incluido en precio)
    iva_porcentaje DECIMAL(5,2),
    iva_monto DECIMAL(12,2),
    
    CONSTRAINT chk_detalle_total CHECK (total = subtotal - descuento)
);

CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);
CREATE INDEX idx_detalle_lote ON detalle_ventas(lote_id) WHERE lote_id IS NOT NULL;
CREATE INDEX idx_detalle_promocion ON detalle_ventas(promocion_id) WHERE promocion_id IS NOT NULL;

COMMENT ON TABLE detalle_ventas IS 'Líneas de venta - ELIMINADO: peso_vendido (no hay balanzas electrónicas)';
COMMENT ON COLUMN detalle_ventas.promocion_id IS 'Tracking para reportes de efectividad de promociones';

-- =====================================================
-- DEVOLUCIONES (Bloque casos complejos)
-- =====================================================

CREATE TABLE devoluciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencia a venta original
    venta_id UUID NOT NULL REFERENCES ventas(id),
    producto_id UUID NOT NULL REFERENCES productos(id),
    lote_id UUID REFERENCES lotes(id), -- Producto vuelve al MISMO lote
    
    -- Cantidades
    cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    monto_devuelto DECIMAL(12,2) NOT NULL CHECK (monto_devuelto > 0),
    
    -- Tipo de devolución
    tipo_devolucion VARCHAR(30) NOT NULL CHECK (
        tipo_devolucion IN ('efectivo', 'nota_credito', 'cambio')
    ),
    
    -- Medio de devolución (Bloque casos complejos - mayormente efectivo)
    medio_devolucion VARCHAR(30) CHECK (
        medio_devolucion IN ('efectivo', 'transferencia', 'nota_credito')
    ),
    
    -- Metadata
    usuario_id UUID REFERENCES usuarios(id),
    motivo TEXT,
    observaciones TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devoluciones_venta ON devoluciones(venta_id);
CREATE INDEX idx_devoluciones_producto ON devoluciones(producto_id);
CREATE INDEX idx_devoluciones_fecha ON devoluciones(fecha DESC);
CREATE INDEX idx_devoluciones_tipo ON devoluciones(tipo_devolucion);

COMMENT ON TABLE devoluciones IS 'Devoluciones - Producto vuelve al MISMO lote. Devoluciones parciales en posnet NO posibles (Argentina) → efectivo';
COMMENT ON COLUMN devoluciones.tipo_devolucion IS 'efectivo: reembolso directo | nota_credito: crédito POS | cambio: refund + nueva venta';

-- =====================================================
-- CIERRES DE CAJA (Bloque F)
-- =====================================================

CREATE TABLE cierres_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Caja (individual por terminal)
    caja_id UUID NOT NULL REFERENCES cajas(id),
    fecha DATE NOT NULL,
    
    -- Montos por medio de pago
    total_efectivo DECIMAL(12,2) DEFAULT 0,
    total_debito DECIMAL(12,2) DEFAULT 0,
    total_credito DECIMAL(12,2) DEFAULT 0,
    total_transferencia DECIMAL(12,2) DEFAULT 0,
    total_qr DECIMAL(12,2) DEFAULT 0,
    
    -- Total general
    total_ventas DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Arqueo de efectivo (opcional)
    efectivo_sistema DECIMAL(12,2), -- Lo que debería haber según sistema
    efectivo_fisico DECIMAL(12,2),  -- Lo que realmente hay contado
    diferencia_efectivo DECIMAL(12,2), -- Faltante o sobrante
    motivo_diferencia TEXT,
    
    -- Metadata
    usuario_id UUID REFERENCES usuarios(id),
    observaciones TEXT,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_cierre_caja_fecha UNIQUE (caja_id, fecha)
);

CREATE INDEX idx_cierres_caja ON cierres_caja(caja_id);
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha DESC);

COMMENT ON TABLE cierres_caja IS 'Cierre individual por caja/terminal - Cierre diario = suma de todas las cajas';
COMMENT ON COLUMN cierres_caja.diferencia_efectivo IS 'Sobrante (+) o faltante (-) en arqueo';

-- =====================================================
-- MOVIMIENTOS DE CAJA (Gastos y Retiros - Bloque F3)
-- =====================================================

CREATE TABLE movimientos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tipo de movimiento
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'retiro')),
    
    -- Monto
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    
    -- Detalle
    concepto VARCHAR(200) NOT NULL,
    comprobante VARCHAR(100), -- Número de factura, recibo, etc.
    
    -- Metadata
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    observaciones TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimientos_caja_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(fecha DESC);
CREATE INDEX idx_movimientos_caja_usuario ON movimientos_caja(usuario_id);

COMMENT ON TABLE movimientos_caja IS 'Gastos y retiros de efectivo - SOLO desde panel admin, NO desde POS';

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rubros_updated_at BEFORE UPDATE ON rubros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION registrar_cambio_precio()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si cambió el precio o el costo
    IF (OLD.precio_venta IS DISTINCT FROM NEW.precio_venta) OR 
       (OLD.costo IS DISTINCT FROM NEW.costo) THEN
        
        INSERT INTO precios_historia (
            producto_id,
            precio_anterior,
            precio_nuevo,
            costo_anterior,
            costo_nuevo,
            tipo_cambio,
            porcentaje_variacion
        ) VALUES (
            NEW.id,
            OLD.precio_venta,
            NEW.precio_venta,
            OLD.costo,
            NEW.costo,
            CASE 
                WHEN OLD.precio_venta IS DISTINCT FROM NEW.precio_venta 
                     AND OLD.costo IS DISTINCT FROM NEW.costo 
                THEN 'ambos'
                WHEN OLD.precio_venta IS DISTINCT FROM NEW.precio_venta 
                THEN 'precio'
                ELSE 'costo'
            END,
            CASE 
                WHEN OLD.precio_venta > 0 AND OLD.precio_venta IS DISTINCT FROM NEW.precio_venta
                THEN ((NEW.precio_venta - OLD.precio_venta) / OLD.precio_venta * 100)
                ELSE 0
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cambio_precio AFTER UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION registrar_cambio_precio();

-- Función para actualizar stock de lote
CREATE OR REPLACE FUNCTION actualizar_stock_lote()
RETURNS TRIGGER AS $$
DECLARE
    cantidad_movimiento INTEGER;
BEGIN
    -- Determinar la cantidad según el tipo de movimiento
    IF NEW.tipo_movimiento IN ('entrada', 'ajuste_positivo', 'devolucion') THEN
        cantidad_movimiento := NEW.cantidad;
    ELSE
        cantidad_movimiento := -NEW.cantidad;
    END IF;
    
    -- Actualizar cantidad en el lote si existe
    IF NEW.lote_id IS NOT NULL THEN
        UPDATE lotes 
        SET cantidad_actual = cantidad_actual + cantidad_movimiento
        WHERE id = NEW.lote_id;
        
        -- Verificar que no quede negativo
        IF (SELECT cantidad_actual FROM lotes WHERE id = NEW.lote_id) < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente en el lote';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_stock AFTER INSERT ON movimientos_stock
    FOR EACH ROW EXECUTE FUNCTION actualizar_stock_lote();

-- Función para auto-generar número de lote si no se provee
CREATE OR REPLACE FUNCTION generar_numero_lote()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_lote IS NULL OR NEW.numero_lote = '' THEN
        -- Formato: LOTE-YYYYMMDD-NNN
        SELECT 'LOTE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD(COALESCE(MAX(SUBSTRING(numero_lote FROM 'LOTE-[0-9]{8}-([0-9]+)')::INTEGER), 0) + 1, 3, '0')
        INTO NEW.numero_lote
        FROM lotes
        WHERE numero_lote LIKE 'LOTE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_lote BEFORE INSERT ON lotes
    FOR EACH ROW EXECUTE FUNCTION generar_numero_lote();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de stock actual por producto
CREATE OR REPLACE VIEW v_stock_actual AS
SELECT 
    p.id AS producto_id,
    p.codigo,
    p.detalle,
    p.maneja_stock,
    p.stock_minimo,
    COALESCE(SUM(l.cantidad_actual), 0) AS stock_total,
    COUNT(DISTINCT l.id) FILTER (WHERE l.activo AND l.cantidad_actual > 0) AS lotes_activos,
    MIN(l.fecha_vencimiento) FILTER (WHERE l.activo AND l.cantidad_actual > 0) AS proximo_vencimiento,
    CASE 
        WHEN COALESCE(SUM(l.cantidad_actual), 0) <= p.stock_minimo THEN true
        ELSE false
    END AS stock_bajo
FROM productos p
LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = true
WHERE p.activo = true AND p.maneja_stock = true
GROUP BY p.id, p.codigo, p.detalle, p.maneja_stock, p.stock_minimo;

COMMENT ON VIEW v_stock_actual IS 'Stock actual con flag de stock_bajo según umbral configurable por producto';

-- Vista de productos próximos a vencer (15 días)
CREATE OR REPLACE VIEW v_productos_proximos_vencer AS
SELECT 
    p.codigo,
    p.detalle,
    p.rubro_id,
    r.nombre AS rubro_nombre,
    l.numero_lote,
    l.fecha_vencimiento,
    l.cantidad_actual,
    DATE_PART('day', l.fecha_vencimiento::timestamp - CURRENT_DATE::timestamp) AS dias_hasta_vencimiento
FROM productos p
INNER JOIN lotes l ON p.id = l.producto_id
LEFT JOIN rubros r ON p.rubro_id = r.id
WHERE 
    l.activo = true 
    AND l.cantidad_actual > 0
    AND l.fecha_vencimiento IS NOT NULL
    AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'
ORDER BY l.fecha_vencimiento ASC;

COMMENT ON VIEW v_productos_proximos_vencer IS 'Productos con lotes próximos a vencer en 15 días - alerta a gerente (email + in-app)';

-- Vista de productos sin movimiento (30 días)
CREATE OR REPLACE VIEW v_productos_sin_movimiento AS
SELECT 
    p.id AS producto_id,
    p.codigo,
    p.detalle,
    p.rubro_id,
    r.nombre AS rubro_nombre,
    p.precio_venta,
    COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
    MAX(dv.venta_fecha) AS ultima_venta,
    DATE_PART('day', CURRENT_DATE::timestamp - MAX(dv.venta_fecha)::timestamp) AS dias_sin_venta
FROM productos p
LEFT JOIN rubros r ON p.rubro_id = r.id
LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = true
LEFT JOIN (
    SELECT 
        dv.producto_id,
        MAX(v.fecha) AS venta_fecha
    FROM detalle_ventas dv
    INNER JOIN ventas v ON dv.venta_id = v.id
    WHERE v.anulada = false
    GROUP BY dv.producto_id
) dv ON p.id = dv.producto_id
WHERE 
    p.activo = true 
    AND p.maneja_stock = true
    AND (dv.venta_fecha IS NULL OR dv.venta_fecha < CURRENT_DATE - INTERVAL '30 days')
GROUP BY p.id, p.codigo, p.detalle, p.rubro_id, r.nombre, p.precio_venta
ORDER BY dias_sin_venta DESC NULLS FIRST;

COMMENT ON VIEW v_productos_sin_movimiento IS 'Productos sin ventas en los últimos 30 días (dead stock)';

-- Vista de promociones vigentes
CREATE OR REPLACE VIEW v_promociones_vigentes AS
SELECT 
    pr.id,
    pr.nombre,
    pr.tipo,
    pr.valor_descuento,
    pr.acumulable,
    pr.fecha_inicio,
    pr.fecha_fin,
    pr.hora_inicio,
    pr.hora_fin,
    pr.dias_semana,
    pr.cantidad_maxima_cliente,
    COUNT(pp.producto_id) AS productos_incluidos
FROM promociones pr
LEFT JOIN promociones_productos pp ON pr.id = pp.promocion_id
WHERE 
    pr.activo = true
    AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin
    AND (
        pr.hora_inicio IS NULL OR
        CURRENT_TIME BETWEEN pr.hora_inicio AND pr.hora_fin
    )
    AND (
        pr.dias_semana IS NULL OR
        EXTRACT(DOW FROM CURRENT_DATE)::INTEGER = ANY(pr.dias_semana)
    )
GROUP BY pr.id, pr.nombre, pr.tipo, pr.valor_descuento, pr.acumulable, 
         pr.fecha_inicio, pr.fecha_fin, pr.hora_inicio, pr.hora_fin, 
         pr.dias_semana, pr.cantidad_maxima_cliente
ORDER BY pr.prioridad DESC, pr.fecha_inicio DESC;

COMMENT ON VIEW v_promociones_vigentes IS 'Promociones activas ahora (fecha, hora, día de semana)';

-- Vista de ventas diarias consolidadas
CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT 
    DATE(v.fecha) AS fecha,
    COUNT(DISTINCT v.id) AS cantidad_tickets,
    COUNT(DISTINCT v.transaccion_id) AS cantidad_transacciones,
    SUM(v.total) AS total_vendido,
    SUM(v.descuentos) AS total_descuentos,
    AVG(v.total) AS ticket_promedio,
    SUM(CASE WHEN mp.medio_pago = 'efectivo' THEN mp.monto ELSE 0 END) AS total_efectivo,
    SUM(CASE WHEN mp.medio_pago = 'debito' THEN mp.monto ELSE 0 END) AS total_debito,
    SUM(CASE WHEN mp.medio_pago = 'credito' THEN mp.monto ELSE 0 END) AS total_credito,
    SUM(CASE WHEN mp.medio_pago = 'transferencia' THEN mp.monto ELSE 0 END) AS total_transferencia,
    SUM(CASE WHEN mp.medio_pago = 'qr' THEN mp.monto ELSE 0 END) AS total_qr
FROM ventas v
LEFT JOIN medios_pago_venta mp ON v.id = mp.venta_id
WHERE v.anulada = false
GROUP BY DATE(v.fecha)
ORDER BY fecha DESC;

COMMENT ON VIEW v_ventas_diarias IS 'Reporte diario de ventas con breakdown por medio de pago';

-- Vista de efectividad de promociones
CREATE OR REPLACE VIEW v_efectividad_promociones AS
SELECT 
    p.id AS promocion_id,
    p.nombre AS promocion_nombre,
    p.tipo AS promocion_tipo,
    p.fecha_inicio,
    p.fecha_fin,
    COUNT(DISTINCT dv.venta_id) AS ventas_con_promocion,
    SUM(dv.cantidad) AS unidades_vendidas,
    SUM(dv.total) AS revenue_generado,
    SUM(dv.descuento) AS descuento_otorgado,
    AVG(dv.total) AS ticket_promedio
FROM promociones p
INNER JOIN detalle_ventas dv ON p.id = dv.promocion_id
INNER JOIN ventas v ON dv.venta_id = v.id
WHERE v.anulada = false
GROUP BY p.id, p.nombre, p.tipo, p.fecha_inicio, p.fecha_fin
ORDER BY revenue_generado DESC;

COMMENT ON VIEW v_efectividad_promociones IS 'Métricas de efectividad de promociones (unidades, revenue, descuentos)';

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Unidades de medida básicas
INSERT INTO unidades_medida (nombre, abreviatura, tipo) VALUES
    ('Unidad', 'UN', 'unidad'),
    ('Kilogramo', 'KG', 'peso'),
    ('Gramo', 'GR', 'peso'),
    ('Litro', 'LT', 'volumen'),
    ('Mililitro', 'ML', 'volumen'),
    ('Metro', 'MT', 'longitud'),
    ('Centímetro', 'CM', 'longitud'),
    ('Pack', 'PACK', 'unidad'),
    ('Caja', 'CAJA', 'unidad'),
    ('Docena', 'DOC', 'unidad');

-- Proveedor genérico
INSERT INTO proveedores (nombre, razon_social, activo) VALUES
    ('Proveedor General', 'Proveedor General S.A.', true);

-- Rubros genéricos (2 niveles de ejemplo)
INSERT INTO rubros (nombre, codigo, nivel, parent_id, default_markup) VALUES
    ('General', 'GEN', 1, NULL, 25.00),
    ('Bebidas', 'BEB', 1, NULL, 30.00),
    ('Limpieza', 'LIM', 1, NULL, 25.00),
    ('Almacén', 'ALM', 1, NULL, 28.00);

-- Cajas (terminales POS)
INSERT INTO cajas (numero, nombre, activo) VALUES
    (1, 'Caja 1', true),
    (2, 'Caja 2', true);

-- Usuario admin inicial (password: 'admin123' - CAMBIAR EN PRODUCCIÓN)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo) VALUES
    ('admin', '$2a$10$XQq3O5KqX.KqX.KqX.KqX.KqX.KqX.KqX.KqX.KqX.KqX.KqX.Kq', 'Administrador', 'admin', true),
    ('cajero', '$2a$10$YRr4P6LrY.LrY.LrY.LrY.LrY.LrY.LrY.LrY.LrY.LrY.LrY.Lr', 'Usuario Cajero', 'cajero', true);

-- Productos especiales (F, V, P, C)
-- Obtener IDs de referencia
DO $$
DECLARE
    proveedor_gen_id UUID;
    rubro_gen_id UUID;
    unidad_un_id UUID;
BEGIN
    SELECT id INTO proveedor_gen_id FROM proveedores WHERE nombre = 'Proveedor General' LIMIT 1;
    SELECT id INTO rubro_gen_id FROM rubros WHERE codigo = 'GEN' LIMIT 1;
    SELECT id INTO unidad_un_id FROM unidades_medida WHERE abreviatura = 'UN' LIMIT 1;
    
    INSERT INTO productos (
        codigo, 
        codigo_barras, 
        detalle, 
        proveedor_id, 
        rubro_id, 
        unidad_medida_id,
        es_codigo_especial,
        requiere_precio_manual,
        maneja_stock,
        costo,
        precio_venta,
        activo
    ) VALUES
        ('F', 'F', 'FIAMBRERÍA (precio manual)', proveedor_gen_id, rubro_gen_id, unidad_un_id, true, true, false, 0, 0, true),
        ('V', 'V', 'VERDULERÍA (precio manual)', proveedor_gen_id, rubro_gen_id, unidad_un_id, true, true, false, 0, 0, true),
        ('P', 'P', 'PANADERÍA (precio manual)', proveedor_gen_id, rubro_gen_id, unidad_un_id, true, true, false, 0, 0, true),
        ('C', 'C', 'CARNICERÍA (precio manual)', proveedor_gen_id, rubro_gen_id, unidad_un_id, true, true, false, 0, 0, true);
END $$;

-- Promoción jubilados (única acumulable)
INSERT INTO promociones (
    nombre,
    descripcion,
    tipo,
    valor_descuento,
    fecha_inicio,
    fecha_fin,
    dias_semana,
    acumulable,
    activo
) VALUES (
    'Descuento Jubilados - Domingos',
    'Descuento especial del 10% para jubilados todos los domingos',
    'descuento_porcentaje',
    10.00,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 years', -- Promoción permanente
    ARRAY[0], -- Solo domingos (0 = domingo)
    true, -- Única promoción acumulable
    true
);

-- =====================================================
-- COMENTARIOS FINALES EN TABLAS
-- =====================================================

-- Sistema de Gestión de Supermercado v2.0 
-- Rediseño completo basado en Q&A exhaustivo (Bloques A-H)

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
