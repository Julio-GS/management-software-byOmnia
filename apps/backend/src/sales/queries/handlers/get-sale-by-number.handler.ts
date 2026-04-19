import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSaleByNumberQuery } from '../get-sale-by-number.query';
import { SalesService } from '../../sales.service';

@QueryHandler(GetSaleByNumberQuery)
export class GetSaleByNumberHandler
  implements IQueryHandler<GetSaleByNumberQuery>
{
  constructor(private readonly salesService: SalesService) {}

  async execute(query: GetSaleByNumberQuery): Promise<any> {
    return this.salesService.findBySaleNumber(query.saleNumber);
  }
}
