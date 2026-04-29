import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { GlobalErrorInterceptor } from '../global-error.interceptor';
import { BusinessException } from '../../exceptions/business.exception';
import { TechnicalException } from '../../exceptions/technical.exception';

describe('GlobalErrorInterceptor', () => {
  let interceptor: GlobalErrorInterceptor;
  let mockExecutionContext: any;
  let mockCallHandler: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GlobalErrorInterceptor],
    }).compile();

    interceptor = module.get<GlobalErrorInterceptor>(GlobalErrorInterceptor);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/api/test',
          headers: { 'user-agent': 'test-agent' },
        }),
        getResponse: jest.fn().mockReturnValue({
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }),
      }),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('successful requests', () => {
    it('should pass through successful responses', (done) => {
      const successResponse = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(successResponse));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (value) => {
          expect(value).toEqual(successResponse);
          done();
        },
      });
    });
  });

  describe('BusinessException handling', () => {
    it('should transform BusinessException to structured JSON', (done) => {
      const exception = new BusinessException(
        'Producto no encontrado',
        'PRODUCT_NOT_FOUND',
        { productId: 123 },
        404,
      );

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(HttpException);
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 404,
            message: 'Producto no encontrado',
            code: 'PRODUCT_NOT_FOUND',
            details: { productId: 123 },
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });

    it('should handle BusinessException without details', (done) => {
      const exception = new BusinessException('Error de validación', 'VALIDATION_ERROR');

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 400,
            message: 'Error de validación',
            code: 'VALIDATION_ERROR',
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });
  });

  describe('TechnicalException handling', () => {
    it('should transform TechnicalException to structured JSON', (done) => {
      const exception = new TechnicalException(
        'Database connection failed',
        'DB_CONNECTION_ERROR',
        { host: 'localhost', port: 5432 },
        503,
      );

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(HttpException);
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 503,
            message: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR',
            details: { host: 'localhost', port: 5432 },
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });
  });

  describe('HttpException handling', () => {
    it('should transform standard HttpException to structured JSON', (done) => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(HttpException);
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 403,
            message: 'Forbidden',
            code: 'HTTP_EXCEPTION',
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });

    it('should handle HttpException with object response', (done) => {
      const exception = new HttpException(
        { message: 'Custom error', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 400,
            message: 'Custom error',
            code: 'HTTP_EXCEPTION',
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should transform generic Error to 500 Internal Server Error', (done) => {
      const exception = new Error('Unexpected error');

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(HttpException);
          const response = err.getResponse();
          expect(response).toEqual({
            statusCode: 500,
            message: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
            timestamp: expect.any(String),
            path: '/api/test',
            method: 'GET',
          });
          done();
        },
      });
    });

    it('should transform non-Error object to 500', (done) => {
      const exception = { random: 'object' };

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          const response = err.getResponse();
          expect(response.statusCode).toBe(500);
          expect(response.code).toBe('INTERNAL_ERROR');
          done();
        },
      });
    });
  });

  describe('timestamp format', () => {
    it('should include ISO 8601 timestamp', (done) => {
      const exception = new BusinessException('Test error', 'TEST_ERROR');

      mockCallHandler.handle.mockReturnValue(throwError(() => exception));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          const response = err.getResponse();
          expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          done();
        },
      });
    });
  });
});
