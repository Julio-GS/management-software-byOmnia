/**
 * CreateProductCommand
 * 
 * Command for creating a new product.
 * Properties match CreateProductDto for 1-to-1 mapping.
 */
export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly price: number,
    public readonly cost: number,
    public readonly sku: string,
    public readonly barcode?: string,
    public readonly stock?: number,
    public readonly minStock?: number,
    public readonly maxStock?: number,
    public readonly categoryId?: string,
    public readonly markup?: number,
    public readonly taxRate?: number,
    public readonly imageUrl?: string,
    public readonly isActive?: boolean,
  ) {}
}
