import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * RefundCalculatorService - Calculate refund amounts for devoluciones
 * 
 * Implements refund calculation business rules:
 * 1. Calculate monto_devuelto with discount applied proportionally
 * 2. Formula: refund = (precio_unitario_pagado * cantidad_devuelta)
 * 3. where precio_unitario_pagado = total / cantidad (already includes discount)
 * 4. Supports partial returns (e.g., 3 of 5 units)
 * 5. Handles promotion discounts correctly
 */
@Injectable()
export class RefundCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate monto_devuelto with discount applied proportionally
   * 
   * Business Rule: monto = (total / cantidad) * cantidad_devolver
   * where total already includes discount: total = subtotal - descuento
   * 
   * Examples:
   * - Simple: 10 units @ $100 each = $1000 total, return 5 = $500 refund
   * - With discount: 10 units, subtotal $1000, discount $100, total $900
   *   precio con descuento = $900 / 10 = $90/unit
   *   return 5 units = $90 * 5 = $450 refund
   * - Partial: 5 units total $900, return 3 = ($900/5) * 3 = $540 refund
   * 
   * @param ventaId - UUID of the venta
   * @param productoId - UUID of the producto
   * @param cantidadDevolver - Quantity to return (can be decimal for weight-based products)
   * @returns Refund amount in ARS
   * @throws NotFoundException if producto not found in venta
   */
  async calcularMontoDevuelto(
    ventaId: string,
    productoId: string,
    cantidadDevolver: number,
  ): Promise<number> {
    const detalleVenta = await this.prisma.detalle_ventas.findFirst({
      where: { venta_id: ventaId, producto_id: productoId },
      select: {
        cantidad: true,
        total: true,
      },
    });

    if (!detalleVenta) {
      throw new NotFoundException('Producto no encontrado en venta');
    }

    // Precio con descuento aplicado = total / cantidad
    // This already includes any promotion discounts that were applied during sale
    const precioConDescuento = Number(detalleVenta.total) / Number(detalleVenta.cantidad);

    return precioConDescuento * cantidadDevolver;
  }
}
