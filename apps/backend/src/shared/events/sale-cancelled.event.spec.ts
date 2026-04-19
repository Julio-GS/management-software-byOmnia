import { SaleCancelledEvent } from './sale-cancelled.event';

describe('SaleCancelledEvent', () => {
  describe('constructor', () => {
    it('should create event with complete payload', () => {
      // Arrange
      const saleId = 'sale-001';
      const reason = 'Customer requested refund';
      const timestamp = new Date('2026-04-14T12:00:00Z');
      const userId = 'user-123';
      const correlationId = 'corr-001';

      // Act
      const event = new SaleCancelledEvent(saleId, reason, timestamp, userId, correlationId);

      // Assert
      expect(event.saleId).toBe(saleId);
      expect(event.reason).toBe(reason);
      expect(event.timestamp).toBe(timestamp);
      expect(event.userId).toBe(userId);
      expect(event.correlationId).toBe(correlationId);
    });

    it('should create event without optional userId', () => {
      // Arrange
      const saleId = 'sale-002';
      const reason = 'System error';
      const timestamp = new Date();
      const correlationId = 'corr-002';

      // Act
      const event = new SaleCancelledEvent(saleId, reason, timestamp, undefined, correlationId);

      // Assert
      expect(event.userId).toBeUndefined();
      expect(event.saleId).toBe(saleId);
      expect(event.reason).toBe(reason);
    });

    it('should handle different cancellation reasons', () => {
      // Arrange
      const reasons = [
        'Out of stock',
        'Payment declined',
        'Duplicate order',
      ];

      // Act & Assert
      reasons.forEach((reason, index) => {
        const event = new SaleCancelledEvent(
          `sale-${index}`,
          reason,
          new Date(),
          'user-admin',
          `corr-${index}`,
        );

        expect(event.reason).toBe(reason);
        expect(event.saleId).toBe(`sale-${index}`);
      });
    });
  });
});
