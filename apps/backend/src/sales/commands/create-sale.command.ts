import { PaymentMethod } from '@omnia/shared-types';

/**
 * CreateSaleCommand
 * 
 * Command for creating a new sale.
 * Properties match CreateSaleDto for 1-to-1 mapping.
 */
export class CreateSaleCommand {
  constructor(
    public readonly items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>,
    public readonly paymentMethod: PaymentMethod,
    public readonly discountAmount?: number,
    public readonly customerId?: string,
    public readonly customerName?: string,
    public readonly customerEmail?: string,
    public readonly notes?: string,
    public readonly cashierId?: string,
    public readonly deviceId?: string,
  ) {}
}
