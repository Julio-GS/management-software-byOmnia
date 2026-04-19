import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsQuery } from '../get-products.query';
import { ProductsService } from '../../products.service';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(private readonly productsService: ProductsService) {}

  async execute(query: GetProductsQuery): Promise<any> {
    // ProductsService.findAll only accepts filters (no pagination yet)
    // TODO: Add pagination support to ProductsService in future phase
    return this.productsService.findAll(query.filters);
  }
}
