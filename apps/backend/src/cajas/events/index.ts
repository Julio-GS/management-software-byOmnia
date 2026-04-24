export class CajaCreatedEvent {
  constructor(
    public readonly cajaId: string,
    public readonly numero: number,
    public readonly nombre: string,
  ) {}
}

export class CajaUpdatedEvent {
  constructor(
    public readonly cajaId: string,
    public readonly changes: Record<string, any>,
  ) {}
}

export class CajaDeletedEvent {
  constructor(public readonly cajaId: string) {}
}
