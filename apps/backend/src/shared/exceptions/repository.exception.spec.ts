import { HttpStatus } from '@nestjs/common';
import { RepositoryException } from './repository.exception';

describe('RepositoryException', () => {
  describe('constructor', () => {
    it('should create exception with message, status code, and details', () => {
      // Arrange
      const message = 'Product with SKU ABC123 already exists';
      const statusCode = HttpStatus.CONFLICT;
      const details = { sku: 'ABC123', field: 'sku' };

      // Act
      const exception = new RepositoryException(message, statusCode, details);

      // Assert
      expect(exception).toBeInstanceOf(RepositoryException);
      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(statusCode);
      expect(exception.getResponse()).toEqual({
        statusCode,
        message,
        details,
      });
    });

    it('should create exception without details', () => {
      // Arrange
      const message = 'Database connection failed';
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      // Act
      const exception = new RepositoryException(message, statusCode);

      // Assert
      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(statusCode);
      expect(exception.getResponse()).toEqual({
        statusCode,
        message,
        details: undefined,
      });
    });

    it('should create NOT_FOUND exception', () => {
      // Arrange
      const message = 'Sale with ID 123 not found';
      const statusCode = HttpStatus.NOT_FOUND;
      const details = { saleId: '123' };

      // Act
      const exception = new RepositoryException(message, statusCode, details);

      // Assert
      expect(exception.getStatus()).toBe(404);
      expect(exception.message).toBe(message);
    });

    it('should extend HttpException', () => {
      // Arrange & Act
      const exception = new RepositoryException('test', HttpStatus.BAD_REQUEST);

      // Assert
      expect(exception).toBeInstanceOf(Error);
      expect(exception.constructor.name).toBe('RepositoryException');
    });
  });
});
