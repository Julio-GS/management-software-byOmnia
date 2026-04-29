export class DiferenciaEfectivoDetectedEvent {
  constructor(
    public readonly cierreId: string,
    public readonly diferencia: number,
  ) {}
}
