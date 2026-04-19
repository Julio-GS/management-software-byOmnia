export class PriceChangedEvent {
  constructor(
    public readonly productId: string,
    public readonly oldPrice: number,
    public readonly newPrice: number,
    public readonly reason?: string,
  ) {}
}
