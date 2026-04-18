export class GetSalesQuery {
  constructor(
    public readonly filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
