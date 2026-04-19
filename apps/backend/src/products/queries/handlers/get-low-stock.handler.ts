import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLowStockQuery } from '../get-low-stock.query';
import { ProductsService } from '../../products.service';

@QueryHandler(GetLowStockQuery)
export class GetLowStockHandler implements IQueryHandler<GetLowStockQuery> {
  constructor(private readonly productsService: ProductsService) {}

  async execute(query: GetLowStockQuery): Promise<any> {
    // ProductsService.getLowStockProducts doesn't accept threshold parameter yet
    // It uses product's minStock field for comparison
    // TODO: Add threshold parameter support in future phase
    return this.productsService.getLowStockProducts();
  }
}
