/**
 * Mock Factories for Testing
 * 
 * Centralized mock data factories following Spanish Prisma schema conventions.
 * Use these factories to create consistent test data across all test suites.
 */

import { productos, ventas, movimientos_stock } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Producto } from '../../products/entities/producto.entity';
import { StockMovement } from '../../inventory/entities/inventory-movement.entity';

/**
 * Create a mock Producto ENTITY following Spanish Prisma schema
 * Returns the Producto entity class (not Prisma type)
 */
export const createMockProducto = (overrides: Partial<Producto> = {}): Producto => {
  const defaults = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    codigo: 'PROD001',
    codigo_alternativo: null,
    codigo_barras: '1234567890',
    detalle: 'Test Product',
    proveedor_id: '550e8400-e29b-41d4-a716-446655440001',
    rubro_id: '550e8400-e29b-41d4-a716-446655440002',
    unidad_medida_id: '550e8400-e29b-41d4-a716-446655440003',
    contenido: null,
    es_codigo_especial: false,
    requiere_precio_manual: false,
    maneja_lotes: false,
    costo: 80,
    iva: 21,
    precio_venta: 100,
    stock_minimo: 10,
    maneja_stock: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const merged = { ...defaults, ...overrides };
  return new Producto(
    merged.id,
    merged.codigo,
    merged.codigo_alternativo,
    merged.codigo_barras,
    merged.detalle,
    merged.proveedor_id,
    merged.rubro_id,
    merged.unidad_medida_id,
    merged.contenido,
    merged.es_codigo_especial,
    merged.requiere_precio_manual,
    merged.maneja_lotes,
    merged.costo,
    merged.iva,
    merged.precio_venta,
    merged.stock_minimo,
    merged.maneja_stock,
    merged.activo,
    merged.created_at,
    merged.updated_at,
  );
};

/**
 * Create a mock StockMovement ENTITY following Spanish Prisma schema
 */
export const createMockStockMovement = (overrides: Partial<StockMovement> = {}): StockMovement => {
  const defaults = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    producto_id: '550e8400-e29b-41d4-a716-446655440000',
    lote_id: null,
    tipo_movimiento: 'ENTRADA',
    cantidad: 10,
    referencia: 'TEST-REF-001',
    venta_id: null,
    usuario_id: '550e8400-e29b-41d4-a716-446655440013',
    observaciones: null,
    fecha: new Date(),
  };

  const merged = { ...defaults, ...overrides };
  return new StockMovement(
    merged.id,
    merged.producto_id,
    merged.lote_id,
    merged.tipo_movimiento,
    merged.cantidad,
    merged.referencia,
    merged.venta_id,
    merged.usuario_id,
    merged.observaciones,
    merged.fecha,
  );
};

/**
 * Create a mock productos PRISMA TYPE (for repository tests)
 */
export const createMockProductoPrisma = (overrides: Partial<productos> = {}): productos => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  codigo: 'PROD001',
  codigo_alternativo: null,
  codigo_barras: '1234567890',
  detalle: 'Test Product',
  proveedor_id: '550e8400-e29b-41d4-a716-446655440001',
  rubro_id: '550e8400-e29b-41d4-a716-446655440002',
  unidad_medida_id: '550e8400-e29b-41d4-a716-446655440003',
  contenido: null,
  es_codigo_especial: false,
  requiere_precio_manual: false,
  maneja_lotes: false,
  costo: new Decimal(80),
  iva: new Decimal(21),
  precio_venta: new Decimal(100),
  stock_minimo: 10,
  maneja_stock: true,
  activo: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

/**
 * Create a mock Venta (Sale) following Spanish Prisma schema
 */
export const createMockVenta = (overrides: Partial<ventas> = {}): ventas => ({
  id: '550e8400-e29b-41d4-a716-446655440010',
  numero_ticket: 'CAJA1-20260422-0001',
  transaccion_id: '550e8400-e29b-41d4-a716-446655440011',
  caja_id: '550e8400-e29b-41d4-a716-446655440012',
  subtotal: new Decimal(100),
  descuentos: new Decimal(0),
  total: new Decimal(100),
  vuelto: new Decimal(0),
  usuario_id: '550e8400-e29b-41d4-a716-446655440013',
  observaciones: null,
  anulada: false,
  motivo_anulacion: null,
  fecha: new Date(),
  fecha_anulacion: null,
  ...overrides,
});

/**
 * Create a mock MovimientoStock (Inventory Movement)
 */
export const createMockMovimientoStock = (
  overrides: Partial<movimientos_stock> = {},
): movimientos_stock => ({
  id: '550e8400-e29b-41d4-a716-446655440020',
  producto_id: '550e8400-e29b-41d4-a716-446655440000',
  lote_id: null,
  tipo_movimiento: 'ENTRADA',
  cantidad: 10,
  referencia: 'TEST-REF-001',
  venta_id: null,
  usuario_id: '550e8400-e29b-41d4-a716-446655440013',
  observaciones: null,
  fecha: new Date(),
  ...overrides,
});

/**
 * Create a mock EventBus for testing
 */
export const createMockEventBus = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

/**
 * Create a mock PinoLogger for testing
 */
export const createMockPinoLogger = () => ({
  setContext: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  assign: jest.fn(),
});

/**
 * Create a mock CacheManager for testing
 */
export const createMockCacheManager = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  wrap: jest.fn(),
  store: {
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(0),
    mget: jest.fn().mockResolvedValue([]),
    mset: jest.fn().mockResolvedValue(undefined),
    mdel: jest.fn().mockResolvedValue(undefined),
  },
});

/**
 * Create a mock PrismaService for testing
 */
export const createMockPrismaService = () => ({
  productos: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  ventas: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  movimientos_stock: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(createMockPrismaService())),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});
