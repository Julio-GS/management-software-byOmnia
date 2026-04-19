import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSalesQuery } from '../get-sales.query';
import { SalesService } from '../../sales.service';

@QueryHandler(GetSalesQuery)
export class GetSalesHandler implements IQueryHandler<GetSalesQuery> {
  constructor(private readonly salesService: SalesService) {}

  async execute(query: GetSalesQuery): Promise<any> {
    // SalesService.findAll only accepts filters (no pagination yet)
    // TODO: Add pagination support to SalesService in future phase
    return this.salesService.findAll(query.filters);
  }
}
