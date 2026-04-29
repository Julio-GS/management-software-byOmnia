import { ICommand } from '@nestjs/cqrs';

/**
 * Command para procesar una devolución de productos
 * Sigue el patrón CQRS para operaciones de escritura
 */
export class ProcesarDevolucionCommand implements ICommand {
  constructor(
    public readonly venta_id: string,
    public readonly producto_id: string,
    public readonly cantidad: number,
    public readonly motivo?: string,
  ) {}
}
