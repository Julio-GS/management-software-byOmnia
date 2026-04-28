-- 1. v_stock_actual
CREATE OR REPLACE VIEW v_stock_actual AS
SELECT 
  p.id as producto_id,
  p.codigo,
  p.detalle,
  COALESCE(SUM(l.cantidad_actual), 0) as stock_total,
  COUNT(l.id) as lotes_activos,
  MIN(l.fecha_vencimiento) as proximo_vencimiento,
  (COALESCE(SUM(l.cantidad_actual), 0) <= COALESCE(p.stock_minimo, 0)) as stock_bajo,
  p.stock_minimo
FROM productos p
LEFT JOIN lotes l ON p.id = l.producto_id AND l.activo = true
WHERE p.maneja_stock = true AND p.activo = true
GROUP BY p.id, p.codigo, p.detalle, p.stock_minimo;

-- 2. v_productos_proximos_vencer
CREATE OR REPLACE VIEW v_productos_proximos_vencer AS
SELECT 
  p.codigo,
  p.detalle,
  r.nombre as rubro_nombre,
  l.numero_lote,
  l.fecha_vencimiento,
  l.cantidad_actual,
  (l.fecha_vencimiento::date - CURRENT_DATE) as dias_hasta_vencimiento
FROM lotes l
JOIN productos p ON l.producto_id = p.id
LEFT JOIN rubros r ON p.rubro_id = r.id
WHERE l.activo = true AND l.cantidad_actual > 0 AND l.fecha_vencimiento IS NOT NULL;

-- 3. v_productos_sin_movimiento
CREATE OR REPLACE VIEW v_productos_sin_movimiento AS
SELECT 
  p.id as producto_id,
  p.codigo,
  p.detalle,
  r.nombre as rubro_nombre,
  COALESCE((SELECT SUM(cantidad_actual) FROM lotes WHERE producto_id = p.id AND activo = true), 0) as stock_actual,
  p.precio_venta,
  MAX(v.fecha) as ultima_venta,
  CURRENT_DATE - MAX(v.fecha)::date as dias_sin_venta
FROM productos p
LEFT JOIN rubros r ON p.rubro_id = r.id
LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
LEFT JOIN ventas v ON dv.venta_id = v.id AND v.anulada = false
WHERE p.maneja_stock = true AND p.activo = true
GROUP BY p.id, p.codigo, p.detalle, r.nombre, p.precio_venta;

-- 4. v_promociones_vigentes
CREATE OR REPLACE VIEW v_promociones_vigentes AS
SELECT 
  id,
  nombre,
  tipo,
  valor_descuento,
  acumulable,
  fecha_inicio,
  fecha_fin,
  hora_inicio,
  hora_fin,
  dias_semana,
  cantidad_maxima_cliente,
  (SELECT COUNT(*) FROM promociones_productos WHERE promocion_id = p.id) as productos_incluidos,
  prioridad
FROM promociones p
WHERE activo = true 
  AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin;

-- 5. v_ventas_diarias
CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT 
  DATE(v.fecha) as fecha,
  COUNT(DISTINCT v.id) as cantidad_tickets,
  COUNT(DISTINCT v.id) as cantidad_transacciones,
  COALESCE(SUM(v.total), 0) as total_vendido,
  COALESCE(SUM(v.descuentos), 0) as total_descuentos,
  CASE WHEN COUNT(DISTINCT v.id) > 0 THEN COALESCE(SUM(v.total), 0) / COUNT(DISTINCT v.id) ELSE 0 END as ticket_promedio,
  COALESCE(SUM(CASE WHEN mp.medio_pago = 'efectivo' THEN mp.monto ELSE 0 END), 0) as total_efectivo,
  COALESCE(SUM(CASE WHEN mp.medio_pago = 'debito' THEN mp.monto ELSE 0 END), 0) as total_debito,
  COALESCE(SUM(CASE WHEN mp.medio_pago = 'credito' THEN mp.monto ELSE 0 END), 0) as total_credito,
  COALESCE(SUM(CASE WHEN mp.medio_pago = 'transferencia' THEN mp.monto ELSE 0 END), 0) as total_transferencia,
  COALESCE(SUM(CASE WHEN mp.medio_pago = 'qr' THEN mp.monto ELSE 0 END), 0) as total_qr
FROM ventas v
LEFT JOIN medios_pago_venta mp ON v.id = mp.venta_id
WHERE v.anulada = false
GROUP BY DATE(v.fecha);

-- 6. v_efectividad_promociones
CREATE OR REPLACE VIEW v_efectividad_promociones AS
SELECT 
  p.id as promocion_id,
  p.nombre as promocion_nombre,
  p.tipo as promocion_tipo,
  p.fecha_inicio,
  p.fecha_fin,
  COUNT(DISTINCT dv.venta_id) as ventas_con_promocion,
  COALESCE(SUM(dv.cantidad), 0) as unidades_vendidas,
  COALESCE(SUM(dv.total), 0) as revenue_generado,
  COALESCE(SUM(dv.descuento), 0) as descuento_otorgado,
  CASE WHEN COUNT(DISTINCT dv.venta_id) > 0 THEN COALESCE(SUM(dv.total), 0) / COUNT(DISTINCT dv.venta_id) ELSE 0 END as ticket_promedio
FROM promociones p
LEFT JOIN detalle_ventas dv ON p.id = dv.promocion_id
LEFT JOIN ventas v ON dv.venta_id = v.id AND v.anulada = false
WHERE p.activo = true
GROUP BY p.id, p.nombre, p.tipo, p.fecha_inicio, p.fecha_fin;
