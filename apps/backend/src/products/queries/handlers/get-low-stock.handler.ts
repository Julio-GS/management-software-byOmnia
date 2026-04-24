import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLowStockQuery } from '../get-low-stock.query';
import { ProductsEsService } from '../../products-es.service';

@QueryHandler(GetLowStockQuery)
export class GetLowStockHandler implements IQueryHandler<GetLowStockQuery> {
  constructor(private readonly ProductsEsService: ProductsEsService) {}

  async execute(query: GetLowStockQuery): Promise<any> {
    // ProductsEsService.getLowStockProducts doesn't accept threshold parameter yet
    // It uses product's minStock field for comparison
    // TODO: Add threshold parameter support in future phase
    return this.ProductsEsService.getLowStockProducts();
  }
}
