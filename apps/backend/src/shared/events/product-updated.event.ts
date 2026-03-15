export class ProductUpdatedEvent {
  constructor(
    public readonly id: string,
    public readonly changes: {
      name?: string;
      sku?: string;
      barcode?: string | null;
      categoryId?: string;
      basePrice?: number;
    },
  ) {}
}
