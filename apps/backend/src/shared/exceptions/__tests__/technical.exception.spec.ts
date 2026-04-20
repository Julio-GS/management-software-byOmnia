import { TechnicalException } from '../technical.exception';

describe('TechnicalException', () => {
  describe('constructor', () => {
    it('should create exception with message and code', () => {
      const exception = new TechnicalException(
        'Database connection failed',
        'DB_CONNECTION_ERROR',
      );

      expect(exception.message).toBe('Database connection failed');
      expect(exception.code).toBe('DB_CONNECTION_ERROR');
      expect(exception.name).toBe('TechnicalException');
      expect(exception.statusCode).toBe(500);
      expect(exception.details).toBeUndefined();
    });

    it('should create exception with details', () => {
      const details = { host: 'localhost', port: 5432, error: 'ECONNREFUSED' };
      const exception = new TechnicalException(
        'Database unreachable',
        'DB_UNREACHABLE',
        details,
      );

      expect(exception.details).toEqual(details);
    });

    it('should create exception with custom status code', () => {
      const exception = new TechnicalException(
        'Service unavailable',
        'SERVICE_UNAVAILABLE',
        undefined,
        503,
      );

      expect(exception.statusCode).toBe(503);
    });

    it('should extend Error correctly', () => {
      const exception = new TechnicalException('Test error', 'TEST_CODE');

      expect(exception instanceof Error).toBe(true);
      expect(exception.stack).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON without details', () => {
      const exception = new TechnicalException(
        'Internal server error',
        'INTERNAL_ERROR',
      );
      const json = exception.toJSON();

      expect(json).toEqual({
        statusCode: 500,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should serialize to JSON with details', () => {
      const details = { query: 'SELECT * FROM users', error: 'Timeout' };
      const exception = new TechnicalException(
        'Query timeout',
        'QUERY_TIMEOUT',
        details,
      );
      const json = exception.toJSON();

      expect(json).toEqual({
        statusCode: 500,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        details,
      });
    });

    it('should mask sensitive details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const details = { password: 'secret123', connectionString: 'postgres://...' };
      const exception = new TechnicalException(
        'Auth failed',
        'AUTH_ERROR',
        details,
      );
      const json = exception.toJSON();

      expect(json.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
