export class PricingRecalculatedEvent {
  constructor(
    public readonly productId: string,
    public readonly basePrice: number,
    public readonly margin: number,
    public readonly finalPrice: number,
    public readonly effectiveDate: Date,
  ) {}
}
