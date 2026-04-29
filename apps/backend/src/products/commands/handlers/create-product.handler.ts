import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from '../create-product.command';
import { ProductsEsService } from '../../products-es.service';
import { CreateProductDto } from '../../dto/create-product-es.dto';

/**
 * CreateProductHandler
 * 
 * Handles CreateProductCommand by delegating to ProductsEsService.
 * Translates English command properties to Spanish DTO properties.
 */
@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(private readonly ProductsEsService: ProductsEsService) {}

  async execute(command: CreateProductCommand): Promise<any> {
    // Transform command (English) to Spanish DTO
    const createProductDto: CreateProductDto = {
      codigo: command.sku,
      detalle: command.name,
      codigo_barras: command.barcode,
      costo: command.cost,
      precio_venta: command.price,
      iva: command.taxRate,
      stock_minimo: command.minStock,
      rubro_id: command.categoryId,
      requiere_precio_manual: false,
      maneja_stock: true,
    };

    // Delegate to service
    return this.ProductsEsService.create(createProductDto);
  }
}

