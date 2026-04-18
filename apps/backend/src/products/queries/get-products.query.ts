export class GetProductsQuery {
  constructor(
    public readonly filters?: {
      categoryId?: string;
      isActive?: boolean;
      search?: string;
    },
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
