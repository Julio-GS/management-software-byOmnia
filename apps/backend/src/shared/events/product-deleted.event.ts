export class ProductDeletedEvent {
  constructor(
    public readonly id: string,
    public readonly sku: string,
  ) {}
}
