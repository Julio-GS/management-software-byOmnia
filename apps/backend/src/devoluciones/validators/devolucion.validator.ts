import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BusinessException } from '../../shared/exceptions/business.exception';

/**
 * DevolucionValidator - Validates business rules for devoluciones
 * 
 * Implements validation rules:
 * 1. Venta must exist
 * 2. Venta must NOT be anulada
 * 3. Producto must exist in venta (detalle_ventas)
 * 4. cantidad_devolver <= cantidad_vendida - SUM(devoluciones_previas)
 * 5. Supports multiple partial devoluciones
 */
@Injectable()
export class DevolucionValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that venta exists in database
   * 
   * @param ventaId - UUID of venta
   * @throws NotFoundException if venta not found
   */
  async validateVentaExists(ventaId: string): Promise<void> {
    const venta = await this.prisma.ventas.findUnique({
      where: { id: ventaId },
      select: { id: true },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }
  }

  /**
   * Validate that venta is not anulada (cancelled)
   * Business Rule: Cannot process refund for cancelled sale
   * 
   * @param ventaId - UUID of venta
   * @throws BusinessException if venta is anulada
   * @throws NotFoundException if venta not found
   */
  async validateVentaNotAnulada(ventaId: string): Promise<void> {
    const venta = await this.prisma.ventas.findUnique({
      where: { id: ventaId },
      select: { id: true, anulada: true },
    });

    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }

    if (venta.anulada) {
      throw new BusinessException(
        'No se puede devolver producto de una venta anulada',
        'VENTA_ANULADA',
        { ventaId },
      );
    }
  }

  /**
   * Validate that cantidad_devolver is within available cantidad
   * Business Rule: cantidad_devolver <= cantidad_vendida - SUM(devoluciones_previas)
   * 
   * This query handles multiple partial returns:
   * - If venta sold 10 units
   * - First devolucion: 3 units → disponible = 10 - 3 = 7
   * - Second devolucion: 2 units → disponible = 10 - (3+2) = 5
   * - Third devolucion attempting 6 units → REJECT (disponible = 5)
   * 
   * @param ventaId - UUID of venta
   * @param productoId - UUID of producto
   * @param cantidadDevolver - Quantity to return
   * @throws BusinessException if cantidad exceeds disponible or producto not in venta
   */
  async validateCantidadDisponible(
    ventaId: string,
    productoId: string,
    cantidadDevolver: number,
  ): Promise<void> {
    const result = await this.prisma.$queryRaw<
      Array<{ cantidad_vendida: number; cantidad_ya_devuelta: number; disponible: number }>
    >`
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

    if (!result.length || Number(result[0].disponible) < cantidadDevolver) {
      throw new BusinessException(
        `Cantidad no disponible para devolución. Máximo disponible: ${
          result[0]?.disponible || 0
        }`,
        'CANTIDAD_NO_DISPONIBLE',
        {
          disponible: result[0]?.disponible || 0,
          solicitado: cantidadDevolver,
          ventaId,
          productoId,
        },
      );
    }
  }

  /**
   * Validate that producto exists in venta (detalle_ventas)
   * 
   * @param ventaId - UUID of venta
   * @param productoId - UUID of producto
   * @throws BusinessException if producto not found in venta
   */
  async validateProductoInVenta(ventaId: string, productoId: string): Promise<void> {
    const result = await this.prisma.$queryRaw<Array<{ disponible: number }>>`
      SELECT (dv.cantidad - COALESCE(SUM(d.cantidad), 0)) AS disponible
      FROM detalle_ventas dv
      LEFT JOIN devoluciones d 
        ON dv.venta_id = d.venta_id 
        AND dv.producto_id = d.producto_id
      WHERE dv.venta_id = ${ventaId}::uuid 
        AND dv.producto_id = ${productoId}::uuid
      GROUP BY dv.cantidad
    `;

    if (!result.length) {
      throw new BusinessException(
        'Producto no encontrado en venta',
        'PRODUCTO_NO_EN_VENTA',
        { ventaId, productoId },
      );
    }
  }

  /**
   * Run all validations for a devolucion
   * This is the main validation method called from the handler
   * 
   * Validations performed:
   * 1. Venta exists
   * 2. Venta is not anulada
   * 3. Producto exists in venta
   * 4. Cantidad is within disponible
   * 
   * @param ventaId - UUID of venta
   * @param productoId - UUID of producto
   * @param cantidadDevolver - Quantity to return
   * @throws NotFoundException if venta not found
   * @throws BusinessException if any business rule violated
   */
  async validateAll(
    ventaId: string,
    productoId: string,
    cantidadDevolver: number,
  ): Promise<void> {
    await this.validateVentaExists(ventaId);
    await this.validateVentaNotAnulada(ventaId);
    await this.validateProductoInVenta(ventaId, productoId);
    await this.validateCantidadDisponible(ventaId, productoId, cantidadDevolver);
  }
}
