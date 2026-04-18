import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from '../create-product.command';
import { ProductsService } from '../../products.service';

/**
 * CreateProductHandler
 * 
 * Handles CreateProductCommand by delegating to ProductsService.
 * Thin wrapper — no business logic, just command-to-DTO transformation.
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(private readonly productsService: ProductsService) {}

  async execute(command: CreateProductCommand): Promise<any> {
    // Transform command to DTO (1-to-1 mapping)
    const createProductDto = {
      name: command.name,
      description: command.description,
      price: command.price,
      cost: command.cost,
      sku: command.sku,
      barcode: command.barcode,
      stock: command.stock,
      minStock: command.minStock,
      maxStock: command.maxStock,
      categoryId: command.categoryId,
      markup: command.markup,
      taxRate: command.taxRate,
      imageUrl: command.imageUrl,
      isActive: command.isActive,
    };

    // Delegate to service
    return this.productsService.create(createProductDto);
  }
}
