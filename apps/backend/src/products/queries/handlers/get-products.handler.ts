import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsQuery } from '../get-products.query';
import { ProductsEsService } from '../../products-es.service';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(private readonly ProductsEsService: ProductsEsService) {}

  async execute(query: GetProductsQuery): Promise<any> {
    // ProductsEsService.findAll only accepts filters (no pagination yet)
    // TODO: Add pagination support to ProductsEsService in future phase
    return this.ProductsEsService.findAll(query.filters);
  }
}
