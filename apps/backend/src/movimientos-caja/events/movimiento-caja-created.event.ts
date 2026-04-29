export class MovimientoCajaCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly tipo: string,
    public readonly monto: number,
    public readonly concepto: string,
    public readonly usuario_id: string,
    public readonly fecha: Date,
  ) {}
}
