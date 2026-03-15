export class ProductCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly sku: string,
    public readonly barcode: string | null,
    public readonly categoryId: string,
    public readonly basePrice: number,
  ) {}
}
