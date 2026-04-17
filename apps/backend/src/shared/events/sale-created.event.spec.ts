import { SaleCreatedEvent } from './sale-created.event';

describe('SaleCreatedEvent', () => {
  describe('constructor', () => {
    it('should create event with complete payload', () => {
      // Arrange
      const saleId = '123e4567-e89b-12d3-a456-426614174000';
      const saleNumber = 'SALE-2026-001';
      const totalAmount = 150.50;
      const items = [
        { productId: 'prod-1', quantity: 2, price: 50.0, subtotal: 100.0 },
        { productId: 'prod-2', quantity: 1, price: 50.5, subtotal: 50.5 },
      ];
      const paymentMethod = 'CASH';
      const timestamp = new Date('2026-04-14T10:00:00Z');
      const userId = 'user-123';
      const correlationId = 'corr-123';

      // Act
      const event = new SaleCreatedEvent(
        saleId,
        saleNumber,
        totalAmount,
        items,
        paymentMethod,
        timestamp,
        userId,
        correlationId,
      );

      // Assert
      expect(event.saleId).toBe(saleId);
      expect(event.saleNumber).toBe(saleNumber);
      expect(event.totalAmount).toBe(totalAmount);
      expect(event.items).toEqual(items);
      expect(event.paymentMethod).toBe(paymentMethod);
      expect(event.timestamp).toBe(timestamp);
      expect(event.userId).toBe(userId);
      expect(event.correlationId).toBe(correlationId);
    });

    it('should create event without optional userId', () => {
      // Arrange
      const saleId = 'sale-456';
      const saleNumber = 'SALE-2026-002';
      const totalAmount = 200.0;
      const items = [{ productId: 'prod-3', quantity: 1, price: 200.0, subtotal: 200.0 }];
      const paymentMethod = 'CREDIT_CARD';
      const timestamp = new Date();
      const correlationId = 'corr-456';

      // Act
      const event = new SaleCreatedEvent(
        saleId,
        saleNumber,
        totalAmount,
        items,
        paymentMethod,
        timestamp,
        undefined,
        correlationId,
      );

      // Assert
      expect(event.userId).toBeUndefined();
      expect(event.saleId).toBe(saleId);
    });

    it('should handle multiple sale items', () => {
      // Arrange
      const items = [
        { productId: 'prod-1', quantity: 5, price: 10.0, subtotal: 50.0 },
        { productId: 'prod-2', quantity: 3, price: 20.0, subtotal: 60.0 },
        { productId: 'prod-3', quantity: 1, price: 15.5, subtotal: 15.5 },
      ];

      // Act
      const event = new SaleCreatedEvent(
        'sale-789',
        'SALE-2026-003',
        125.5,
        items,
        'DEBIT_CARD',
        new Date(),
        'user-789',
        'corr-789',
      );

      // Assert
      expect(event.items).toHaveLength(3);
      expect(event.items[0].productId).toBe('prod-1');
      expect(event.items[1].quantity).toBe(3);
      expect(event.items[2].subtotal).toBe(15.5);
    });
  });
});
