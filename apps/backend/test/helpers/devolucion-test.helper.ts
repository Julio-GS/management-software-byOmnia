/**
 * Devolucion Test Helpers - Database setup utilities for integration tests
 * 
 * Provides test data creation functions for devoluciones integration tests.
 * Uses SQLite in-memory for fast test execution.
 */
import { PrismaClient } from '@prisma/client';

/**
 * Test helper interface for creating test data
 */
export interface TestVentaData {
  id?: string;
  numero_ticket: string;
  caja_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_lista?: number;
  precio_final?: number;
  descuento?: number;
  lote_id?: string;
  promocion_id?: string;
  estado?: 'COMPLETA' | 'ANULADA';
  fecha_venta?: Date;
}

export interface TestLoteData {
  id?: string;
  producto_id: string;
  numero_lote: string;
  stock: number;
  stock_minimo?: number;
  fecha_vencimiento?: Date;
}

export interface TestProductoData {
  id?: string;
  codigo: string;
  detalle: string;
  maneja_lotes?: boolean;
  requiere_precio_manual?: boolean;
}

export interface TestCajaData {
  id?: string;
  numero: number;
  nombre: string;
  activo?: boolean;
}

/**
 * Creates a test venta with all required relations
 * Note: In a real integration test, this would create actual database records
 * For unit tests with mocks, use this interface definition
 */
export async function createTestVenta(
  prisma: PrismaClient,
  data: TestVentaData
): Promise<any> {
  // This is a placeholder for integration test setup
  // Real implementation would create:
  // 1. Caja (if not exists)
  // 2. Producto (if not exists)
  // 3. Lote (if not exists)
  // 4. Venta
  // 5. DetalleVenta
  return {
    id: data.id || 'test-venta-id',
    numero_ticket: data.numero_ticket,
    caja_id: data.caja_id,
    producto_id: data.producto_id,
    cantidad: data.cantidad,
    precio_unitario: data.precio_unitario,
    precio_final: data.precio_final || data.precio_unitario * data.cantidad,
    lote_id: data.lote_id,
    promocion_id: data.promocion_id,
    estado: data.estado || 'COMPLETA',
    fecha: data.fecha_venta || new Date(),
  };
}

/**
 * Creates a test lote with stock
 */
export async function createTestLote(
  prisma: PrismaClient,
  data: TestLoteData
): Promise<any> {
  return {
    id: data.id || 'test-lote-id',
    producto_id: data.producto_id,
    numero_lote: data.numero_lote,
    stock_actual: data.stock,
    stock_minimo: data.stock_minimo || 5,
    fecha_vencimiento: data.fecha_vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Creates a test producto
 */
export async function createTestProducto(
  prisma: PrismaClient,
  data: TestProductoData
): Promise<any> {
  return {
    id: data.id || 'test-producto-id',
    codigo: data.codigo,
    detalle: data.detalle,
    maneja_lotes: data.maneja_lotes ?? true,
    requiere_precio_manual: data.requiere_precio_manual ?? false,
  };
}

/**
 * Creates a test caja
 */
export async function createTestCaja(
  prisma: PrismaClient,
  data: TestCajaData
): Promise<any> {
  return {
    id: data.id || 'test-caja-id',
    numero: data.numero,
    nombre: data.nombre,
    activo: data.activo ?? true,
  };
}

/**
 * Clean up test data
 * Note: In real implementation, would delete test records
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // In real integration tests: delete test records
  // await prisma.devoluciones.deleteMany({ where: { ... } });
  // await prisma.ventas.deleteMany({ where: { ... } });
}

/**
 * Calculate expected monto devuelto with promotion applied
 * This mimics the business logic from RefundCalculatorService
 */
export function calculateExpectedMonto(
  cantidad: number,
  precioLista: number,
  precioFinal: number
): number {
  if (precioFinal < precioLista) {
    // There was a discount, calculate proportionally
    const discountRatio = precioFinal / (precioLista * cantidad);
    const unitPriceWithDiscount = precioFinal / cantidad;
    return unitPriceWithDiscount * cantidad;
  }
  return precioLista * cantidad;
}