-- =====================================================
-- SCHEMA: Sistema de Gestión de Supermercado
-- PostgreSQL 12+
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

-- Rubros (categorías de productos)
CREATE TABLE rubros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(20) UNIQUE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rubros_nombre ON rubros(nombre);

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
    pesable BOOLEAN DEFAULT false,
    requiere_balanza BOOLEAN DEFAULT false,
    plu_balanza VARCHAR(10), -- Código para balanzas electrónicas
    peso_unitario DECIMAL(10,3), -- Peso en kg para productos pesables pre-empaquetados
    contenido DECIMAL(10,3), -- Contenido neto (ej: 500ml, 1kg)
    
    -- Costos
    costo_neto DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_final DECIMAL(12,2) NOT NULL DEFAULT 0, -- Costo con impuestos
    margen_porcentaje DECIMAL(5,2), -- Margen de ganancia objetivo
    
    -- Impuestos
    impuestos DECIMAL(12,2) DEFAULT 0,
    alicuota_iva DECIMAL(5,2) DEFAULT 21.00,
    
    -- Precio de venta
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Configuración operativa
    etiquetar BOOLEAN DEFAULT false,
    mostrar_cartel BOOLEAN DEFAULT true,
    maneja_stock BOOLEAN DEFAULT true,
    facturable BOOLEAN DEFAULT true,
    es_servicio BOOLEAN DEFAULT false,
    
    -- Conversiones y coeficientes
    coeficiente DECIMAL(10,4), -- Para conversión entre unidades
    
    -- Auditoría
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_precios_positivos CHECK (
        costo_neto >= 0 AND 
        costo_final >= 0 AND 
        precio_venta >= 0
    ),
    CONSTRAINT chk_pesable_peso CHECK (
        NOT pesable OR peso_unitario IS NOT NULL OR requiere_balanza = true
    )
);

-- Índices para productos
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX idx_productos_detalle ON productos USING gin(detalle gin_trgm_ops);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_rubro ON productos(rubro_id);
CREATE INDEX idx_productos_activo ON productos(activo) WHERE activo = true;
CREATE INDEX idx_productos_pesable ON productos(pesable) WHERE pesable = true;

-- =====================================================
-- HISTORIAL DE PRECIOS Y COSTOS
-- =====================================================

CREATE TABLE precios_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    -- Valores anteriores
    precio_anterior DECIMAL(12,2),
    costo_anterior DECIMAL(12,2),
    
    -- Valores nuevos
    precio_nuevo DECIMAL(12,2),
    costo_nuevo DECIMAL(12,2),
    
    -- Metadata del cambio
    usuario VARCHAR(100),
    motivo VARCHAR(200),
    tipo_cambio VARCHAR(20) CHECK (tipo_cambio IN ('precio', 'costo', 'ambos')),
    porcentaje_variacion DECIMAL(8,2),
    
    -- Auditoría
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_precios_hist_producto ON precios_historico(producto_id);
CREATE INDEX idx_precios_hist_fecha ON precios_historico(fecha_cambio DESC);

-- =====================================================
-- CONTROL DE LOTES Y VENCIMIENTOS
-- =====================================================

CREATE TABLE lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    -- Identificación del lote
    numero_lote VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE,
    
    -- Cantidades
    cantidad_inicial INTEGER NOT NULL CHECK (cantidad_inicial > 0),
    cantidad_actual INTEGER NOT NULL CHECK (cantidad_actual >= 0),
    
    -- Costeo
    costo_unitario DECIMAL(12,2) NOT NULL,
    
    -- Fechas
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_produccion DATE,
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    CONSTRAINT chk_lote_cantidad CHECK (cantidad_actual <= cantidad_inicial),
    CONSTRAINT uq_producto_lote UNIQUE (producto_id, numero_lote)
);

CREATE INDEX idx_lotes_producto ON lotes(producto_id);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento) WHERE activo = true;
CREATE INDEX idx_lotes_activo ON lotes(activo, producto_id) WHERE activo = true;

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
    
    -- Cantidad y costo
    cantidad INTEGER NOT NULL,
    costo_unitario DECIMAL(12,2),
    
    -- Referencias
    referencia VARCHAR(100), -- Número de remito, ticket, etc.
    venta_id UUID, -- Referencia a la venta si es una salida por venta
    
    -- Metadata
    usuario VARCHAR(100),
    observaciones TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_movimiento_cantidad CHECK (
        (tipo_movimiento IN ('entrada', 'ajuste_positivo', 'devolucion') AND cantidad > 0) OR
        (tipo_movimiento IN ('salida', 'ajuste_negativo', 'venta', 'merma', 'vencimiento') AND cantidad > 0)
    )
);

CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_movimientos_lote ON movimientos_stock(lote_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_stock(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(fecha DESC);
CREATE INDEX idx_movimientos_venta ON movimientos_stock(venta_id) WHERE venta_id IS NOT NULL;

-- =====================================================
-- PROMOCIONES Y OFERTAS
-- =====================================================

CREATE TABLE promociones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    
    -- Tipo de promoción
    tipo VARCHAR(30) NOT NULL CHECK (
        tipo IN (
            'descuento_porcentual',    -- Ej: 20% de descuento
            'descuento_monto',          -- Ej: $500 de descuento
            'cantidad_por_cantidad',    -- Ej: 2x1, 3x2
            'precio_especial'           -- Ej: Precio fijo promocional
        )
    ),
    
    -- Valores según tipo
    valor_descuento DECIMAL(12,2), -- Porcentaje o monto
    cantidad_requerida INTEGER,    -- Para 2x1, 3x2, etc.
    cantidad_bonificada INTEGER,   -- Cuántos lleva gratis
    precio_especial DECIMAL(12,2), -- Precio fijo promocional
    
    -- Vigencia
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    dias_semana INTEGER[], -- Array de días: 0=Domingo, 1=Lunes, etc. NULL = todos los días
    hora_inicio TIME,      -- Para promociones por horario
    hora_fin TIME,
    
    -- Límites
    limite_por_cliente INTEGER, -- Cantidad máxima por cliente
    stock_promocional INTEGER,  -- Stock dedicado a la promoción
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    prioridad INTEGER DEFAULT 0, -- Para resolver conflictos entre promociones
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_promocion_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_promocion_valores CHECK (
        (tipo = 'descuento_porcentual' AND valor_descuento BETWEEN 0 AND 100) OR
        (tipo = 'descuento_monto' AND valor_descuento > 0) OR
        (tipo = 'cantidad_por_cantidad' AND cantidad_requerida > 0 AND cantidad_bonificada > 0) OR
        (tipo = 'precio_especial' AND precio_especial > 0)
    )
);

CREATE INDEX idx_promociones_vigencia ON promociones(fecha_inicio, fecha_fin) WHERE activo = true;
CREATE INDEX idx_promociones_activo ON promociones(activo) WHERE activo = true;

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
-- VENTAS
-- =====================================================

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    numero_ticket VARCHAR(50) UNIQUE NOT NULL,
    
    -- Montos
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuentos DECIMAL(12,2) DEFAULT 0,
    impuestos DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Pago
    medio_pago VARCHAR(30) CHECK (
        medio_pago IN ('efectivo', 'debito', 'credito', 'transferencia', 'qr', 'mixto')
    ),
    monto_pagado DECIMAL(12,2),
    vuelto DECIMAL(12,2),
    
    -- Metadata
    usuario VARCHAR(100),
    caja_numero INTEGER,
    observaciones TEXT,
    anulada BOOLEAN DEFAULT false,
    motivo_anulacion TEXT,
    
    -- Auditoría
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_anulacion TIMESTAMP,
    
    CONSTRAINT chk_venta_total CHECK (total = subtotal - descuentos + impuestos)
);

CREATE INDEX idx_ventas_numero ON ventas(numero_ticket);
CREATE INDEX idx_ventas_fecha ON ventas(fecha DESC);
CREATE INDEX idx_ventas_usuario ON ventas(usuario);
CREATE INDEX idx_ventas_no_anuladas ON ventas(anulada) WHERE anulada = false;

-- Detalle de ventas
CREATE TABLE detalle_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    lote_id UUID REFERENCES lotes(id), -- Para trazabilidad
    promocion_id UUID REFERENCES promociones(id),
    
    -- Cantidad y precio
    cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    
    -- Impuestos desglosados
    iva_porcentaje DECIMAL(5,2),
    iva_monto DECIMAL(12,2),
    
    -- Metadata
    peso_vendido DECIMAL(10,3), -- Para productos pesables
    
    CONSTRAINT chk_detalle_total CHECK (total = subtotal - descuento)
);

CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);
CREATE INDEX idx_detalle_lote ON detalle_ventas(lote_id) WHERE lote_id IS NOT NULL;

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

-- Función para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION registrar_cambio_precio()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si cambió el precio o el costo
    IF (OLD.precio_venta IS DISTINCT FROM NEW.precio_venta) OR 
       (OLD.costo_final IS DISTINCT FROM NEW.costo_final) THEN
        
        INSERT INTO precios_historico (
            producto_id,
            precio_anterior,
            precio_nuevo,
            costo_anterior,
            costo_nuevo,
            tipo_cambio,
            porcentaje_variacion,
            usuario
        ) VALUES (
            NEW.id,
            OLD.precio_venta,
            NEW.precio_venta,
            OLD.costo_final,
            NEW.costo_final,
            CASE 
                WHEN OLD.precio_venta IS DISTINCT FROM NEW.precio_venta 
                     AND OLD.costo_final IS DISTINCT FROM NEW.costo_final 
                THEN 'ambos'
                WHEN OLD.precio_venta IS DISTINCT FROM NEW.precio_venta 
                THEN 'precio'
                ELSE 'costo'
            END,
            CASE 
                WHEN OLD.precio_venta > 0 AND OLD.precio_venta IS DISTINCT FROM NEW.precio_venta
                THEN ((NEW.precio_venta - OLD.precio_venta) / OLD.precio_venta * 100)
                ELSE 0
            END,
            current_user
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
    COALESCE(SUM(l.cantidad_actual), 0) AS stock_total,
    COUNT(DISTINCT l.id) FILTER (WHERE l.activo AND l.cantidad_actual > 0) AS lotes_activos,
    MIN(l.fecha_vencimiento) FILTER (WHERE l.activo AND l.cantidad_actual > 0) AS proximo_vencimiento
FROM productos p
LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = true
WHERE p.activo = true AND p.maneja_stock = true
GROUP BY p.id, p.codigo, p.detalle, p.maneja_stock;

-- Vista de productos próximos a vencer (30 días)
CREATE OR REPLACE VIEW v_productos_proximos_vencer AS
SELECT 
    p.codigo,
    p.detalle,
    l.numero_lote,
    l.fecha_vencimiento,
    l.cantidad_actual,
    DATE_PART('day', l.fecha_vencimiento - CURRENT_DATE) AS dias_hasta_vencimiento
FROM productos p
INNER JOIN lotes l ON p.id = l.producto_id
WHERE 
    l.activo = true 
    AND l.cantidad_actual > 0
    AND l.fecha_vencimiento IS NOT NULL
    AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY l.fecha_vencimiento ASC;

-- Vista de promociones vigentes
CREATE OR REPLACE VIEW v_promociones_vigentes AS
SELECT 
    pr.id,
    pr.nombre,
    pr.tipo,
    pr.valor_descuento,
    pr.fecha_inicio,
    pr.fecha_fin,
    COUNT(pp.producto_id) AS productos_incluidos
FROM promociones pr
LEFT JOIN promociones_productos pp ON pr.id = pp.promocion_id
WHERE 
    pr.activo = true
    AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin
GROUP BY pr.id, pr.nombre, pr.tipo, pr.valor_descuento, pr.fecha_inicio, pr.fecha_fin
ORDER BY pr.prioridad DESC, pr.fecha_inicio DESC;

-- Vista de ventas diarias
CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT 
    DATE(fecha) AS fecha,
    COUNT(*) AS cantidad_tickets,
    SUM(total) AS total_vendido,
    SUM(descuentos) AS total_descuentos,
    AVG(total) AS ticket_promedio
FROM ventas
WHERE anulada = false
GROUP BY DATE(fecha)
ORDER BY fecha DESC;

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

-- Rubro genérico
INSERT INTO rubros (nombre, codigo, activo) VALUES
    ('General', 'GEN', true);

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE productos IS 'Catálogo principal de productos del supermercado';
COMMENT ON TABLE lotes IS 'Control de lotes y vencimientos por producto';
COMMENT ON TABLE movimientos_stock IS 'Registro de todos los movimientos de inventario';
COMMENT ON TABLE precios_historico IS 'Auditoría de cambios en precios y costos';
COMMENT ON TABLE promociones IS 'Definición de promociones y ofertas especiales';
COMMENT ON TABLE ventas IS 'Registro de ventas (tickets)';
COMMENT ON TABLE detalle_ventas IS 'Líneas de detalle de cada venta';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
