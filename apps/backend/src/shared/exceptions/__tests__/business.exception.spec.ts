import { BusinessException } from '../business.exception';

describe('BusinessException', () => {
  describe('constructor', () => {
    it('should create exception with message and code', () => {
      const exception = new BusinessException('Producto no encontrado', 'PRODUCT_NOT_FOUND');

      expect(exception.message).toBe('Producto no encontrado');
      expect(exception.code).toBe('PRODUCT_NOT_FOUND');
      expect(exception.name).toBe('BusinessException');
      expect(exception.statusCode).toBe(400);
      expect(exception.details).toBeUndefined();
    });

    it('should create exception with details', () => {
      const details = { productId: 123, reason: 'deleted' };
      const exception = new BusinessException(
        'Producto no disponible',
        'PRODUCT_UNAVAILABLE',
        details,
      );

      expect(exception.details).toEqual(details);
    });

    it('should create exception with custom status code', () => {
      const exception = new BusinessException(
        'Recurso no encontrado',
        'NOT_FOUND',
        undefined,
        404,
      );

      expect(exception.statusCode).toBe(404);
    });

    it('should extend Error correctly', () => {
      const exception = new BusinessException('Test error', 'TEST_CODE');

      expect(exception instanceof Error).toBe(true);
      expect(exception.stack).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON without details', () => {
      const exception = new BusinessException('Error de negocio', 'BUSINESS_ERROR');
      const json = exception.toJSON();

      expect(json).toEqual({
        statusCode: 400,
        message: 'Error de negocio',
        code: 'BUSINESS_ERROR',
      });
    });

    it('should serialize to JSON with details', () => {
      const details = { field: 'precio', value: -100 };
      const exception = new BusinessException(
        'Precio inválido',
        'INVALID_PRICE',
        details,
      );
      const json = exception.toJSON();

      expect(json).toEqual({
        statusCode: 400,
        message: 'Precio inválido',
        code: 'INVALID_PRICE',
        details,
      });
    });
  });
});
