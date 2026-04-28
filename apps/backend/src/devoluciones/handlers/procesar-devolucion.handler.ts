import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ProcesarDevolucionCommand } from '../commands/procesar-devolucion.command';
import { DevolucionValidator } from '../validators/devolucion.validator';
import { RefundCalculatorService } from '../services/refund-calculator.service';
import { DevolucionesRepository } from '../repositories/devoluciones.repository';
import { PrismaService } from '../../database/prisma.service';
import { TechnicalException } from '../../shared/exceptions/technical.exception';
import { DevolucionCreatedEvent } from '../../shared/events/devolucion-created.event';
import { Devolucion } from '../entities/devolucion.entity';

/**
 * Handler para procesar una devolución completa (CQRS Command Handler)
 * 
 * Responsabilidades:
 * 1. Validar reglas de negocio (usando DevolucionValidator)
 * 2. Calcular monto de devolución (usando RefundCalculatorService)
 * 3. Obtener lote_id del detalle_venta original (trazabilidad)
 * 4. Crear registro de devolución
 * 5. Actualizar inventario (restock al mismo lote)
 * 6. Crear movimiento de inventario
 * 7. Emitir evento de dominio
 * 
 * Todo en una transacción SERIALIZABLE para garantizar atomicidad.
 */
@Injectable()
@CommandHandler(ProcesarDevolucionCommand)
export class ProcesarDevolucionHandler implements ICommandHandler<ProcesarDevolucionCommand> {
  constructor(
    private readonly validator: DevolucionValidator,
    private readonly refundCalculator: RefundCalculatorService,
    private readonly repository: DevolucionesRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ProcesarDevolucionCommand): Promise<Devolucion> {
    const { venta_id, producto_id, cantidad, motivo } = command;

    // 1. Validar reglas de negocio (venta existe, no anulada, cantidad disponible, producto en venta)
    await this.validator.validateAll(venta_id, producto_id, cantidad);

    // 2. Calcular monto exacto de devolución (incluye descuentos proporcionales)
    const montoDevuelto = await this.refundCalculator.calcularMontoDevuelto(
      venta_id,
      producto_id,
      cantidad,
    );

    // 3. Obtener lote_id del detalle_venta para trazabilidad
    const detalleVenta = await this.prisma.detalle_ventas.findFirst({
      where: { venta_id, producto_id },
    });

    if (!detalleVenta) {
      throw new TechnicalException('Detalle de venta no encontrado', 'SYSTEM_ERROR');
    }

    const loteId = detalleVenta.lote_id;

    // 4. Ejecutar todo en transacción SERIALIZABLE
    const devolucion = await this.prisma.$transaction(
      async (tx) => {
        // 4.1 Crear registro de devolución
        const nuevaDevolucion = await this.repository.create(
          {
            venta_id,
            producto_id,
            lote_id: loteId,
            cantidad,
            monto_devuelto: montoDevuelto,
            tipo_devolucion: 'EFECTIVO', // TODO: obtener de configuración o parámetro
            medio_devolucion: 'EFECTIVO', // TODO: obtener de configuración o parámetro
            usuario_id: 'SYSTEM', // TODO: obtener del contexto de autenticación
            motivo: motivo || 'Sin motivo especificado',
          },
          tx,
        );

        // 4.2 Actualizar inventario (restock al mismo lote)
        if (loteId) {
          await tx.lotes.update({
            where: { id: loteId },
            data: { cantidad_actual: { increment: cantidad } },
          });
        }

        // 4.3 Crear movimiento de inventario
        await tx.movimientos_stock.create({
          data: {
            tipo_movimiento: 'DEVOLUCION',
            producto_id,
            lote_id: loteId,
            cantidad,
            referencia: `Devolución de venta #${venta_id}`,
            usuario_id: null, // TODO: obtener del contexto
            fecha: new Date(),
          },
        });

        return nuevaDevolucion;
      },
      { isolationLevel: 'Serializable' },
    );

    // 5. Emitir evento de dominio
    this.eventBus.publish(
      new DevolucionCreatedEvent(
        devolucion.id,
        String(venta_id),
        String(producto_id),
        loteId,
        cantidad,
        montoDevuelto,
        devolucion.tipo_devolucion,
        devolucion.fecha,
        devolucion.usuario_id,
      ),
    );

    return devolucion;
  }
}
