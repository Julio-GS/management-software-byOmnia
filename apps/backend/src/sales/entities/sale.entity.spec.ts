import { Sale } from './sale.entity';

describe('Sale', () => {
  describe('calculateTotal', () => {
    it('should calculate total from items', () => {
      // Arrange
      const items = [
        { productId: 'prod-1', quantity: 2, unitPrice: 50.0, subtotal: 100.0, productName: 'Product 1' },
        { productId: 'prod-2', quantity: 1, unitPrice: 30.5, subtotal: 30.5, productName: 'Product 2' },
      ];
      const sale = new Sale(
        'sale-001',
        'SALE-001',
        items,
        0, // Will be recalculated
        'CASH',
        'COMPLETED',
        new Date(),
      );

      // Act
      const total = sale.calculateTotal();

      // Assert
      expect(total).toBe(130.5);
      expect(sale.total).toBe(130.5);
    });

    it('should return 0 for empty items', () => {
      // Arrange
      const sale = new Sale('sale-002', 'SALE-002', [], 0, 'CASH', 'COMPLETED', new Date(), undefined, true);

      // Act
      const total = sale.calculateTotal();

      // Assert
      expect(total).toBe(0);
    });

    it('should handle multiple items with different quantities', () => {
      // Arrange
      const items = [
        { productId: 'prod-1', quantity: 5, unitPrice: 10.0, subtotal: 50.0, productName: 'Product 1' },
        { productId: 'prod-2', quantity: 3, unitPrice: 25.0, subtotal: 75.0, productName: 'Product 2' },
        { productId: 'prod-3', quantity: 1, unitPrice: 100.0, subtotal: 100.0, productName: 'Product 3' },
      ];
      const sale = new Sale('sale-003', 'SALE-003', items, 0, 'CREDIT_CARD', 'COMPLETED', new Date());

      // Act
      const total = sale.calculateTotal();

      // Assert
      expect(total).toBe(225.0);
    });
  });

  describe('cancel', () => {
    it('should cancel completed sale', () => {
      // Arrange
      const sale = new Sale(
        'sale-001',
        'SALE-001',
        [{ productId: 'prod-1', quantity: 2, unitPrice: 50.0, subtotal: 100.0, productName: 'Product 1' }],
        100.0,
        'CASH',
        'COMPLETED',
        new Date(),
      );

      // Act
      sale.cancel();

      // Assert
      expect(sale.status).toBe('CANCELLED');
      expect(sale.cancelledAt).toBeInstanceOf(Date);
    });

    it('should throw error when cancelling already cancelled sale', () => {
      // Arrange
      const sale = new Sale(
        'sale-002',
        'SALE-002',
        [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
        10.0,
        'CASH',
        'CANCELLED',
        new Date(),
        new Date(),
      );

      // Act & Assert
      expect(() => sale.cancel()).toThrow('Sale is already cancelled');
    });

    it('should throw error when cancelling pending sale', () => {
      // Arrange
      const sale = new Sale(
        'sale-003',
        'SALE-003',
        [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
        10.0,
        'CASH',
        'PENDING',
        new Date(),
      );

      // Act & Assert
      expect(() => sale.cancel()).toThrow('Only completed sales can be cancelled');
    });
  });

  describe('validate', () => {
    it('should validate sale with valid data', () => {
      // Arrange
      const sale = new Sale(
        'sale-001',
        'SALE-001',
        [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
        10.0,
        'CASH',
        'COMPLETED',
        new Date(),
      );

      // Act & Assert
      expect(() => sale.validate()).not.toThrow();
    });

    it('should throw error when items are empty', () => {
      // Arrange
      const sale = new Sale('sale-002', 'SALE-002', [], 0, 'CASH', 'COMPLETED', new Date(), undefined, true);

      // Act & Assert
      expect(() => sale.validate()).toThrow('Sale must have at least one item');
    });

    it('should throw error when total is negative', () => {
      // Arrange
      const sale = new Sale(
        'sale-003',
        'SALE-003',
        [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
        -10.0,
        'CASH',
        'COMPLETED',
        new Date(),
        undefined,
        true,
      );

      // Act & Assert
      expect(() => sale.validate()).toThrow('Sale total must be non-negative');
    });

    it('should throw error when saleNumber is empty', () => {
      // Arrange
      const sale = new Sale(
        'sale-004',
        '',
        [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
        10.0,
        'CASH',
        'COMPLETED',
        new Date(),
        undefined,
        true,
      );

      // Act & Assert
      expect(() => sale.validate()).toThrow('Sale number is required');
    });
  });
});
