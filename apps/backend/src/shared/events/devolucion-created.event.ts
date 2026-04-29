import { DomainEvent } from './domain-event.base';

/**
 * Event emitted when a devolucion (refund/return) is created
 */
export class DevolucionCreatedEvent extends DomainEvent {
  constructor(
    public readonly devolucionId: string,
    public readonly ventaId: string,
    public readonly productoId: string,
    public readonly loteId: string | null,
    public readonly cantidad: number,
    public readonly montoDevuelto: number,
    public readonly tipoDevolucion: string,
    public readonly fecha: Date,
    public readonly usuarioId: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'DevolucionCreatedEvent';
  }
}
