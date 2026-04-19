import { ISalesRepository } from './sales.repository.interface';
import { Sale } from '../entities/sale.entity';

describe('ISalesRepository', () => {
  it('should define repository contract with 6 methods', () => {
    // Arrange: Create a mock implementation
    const mockRepository: ISalesRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByDateRange: jest.fn(),
      findAll: jest.fn(),
    };

    // Assert: Verify all methods are defined
    expect(mockRepository.create).toBeDefined();
    expect(mockRepository.findById).toBeDefined();
    expect(mockRepository.update).toBeDefined();
    expect(mockRepository.cancel).toBeDefined();
    expect(mockRepository.findByDateRange).toBeDefined();
    expect(mockRepository.findAll).toBeDefined();
  });

  it('should return Sale entity from create method', async () => {
    // Arrange
    const mockSale = new Sale(
      'sale-001',
      'SALE-001',
      [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
      10.0,
      'CASH',
      'COMPLETED',
      new Date(),
    );

    const mockRepository: ISalesRepository = {
      create: jest.fn().mockResolvedValue(mockSale),
      findById: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByDateRange: jest.fn(),
      findAll: jest.fn(),
    };

    // Act
    const result = await mockRepository.create({
      saleNumber: 'SALE-001',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10.0, subtotal: 10.0, productName: 'Product 1' }],
      total: 10.0,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
    });

    // Assert
    expect(result).toBeInstanceOf(Sale);
    expect(result.saleNumber).toBe('SALE-001');
  });

  it('should return null from findById when not found', async () => {
    // Arrange
    const mockRepository: ISalesRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      cancel: jest.fn(),
      findByDateRange: jest.fn(),
      findAll: jest.fn(),
    };

    // Act
    const result = await mockRepository.findById('non-existent-id');

    // Assert
    expect(result).toBeNull();
  });
});
