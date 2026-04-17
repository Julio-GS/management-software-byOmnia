import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * RepositoryException
 * 
 * Custom exception for repository layer errors.
 * Provides structured error information including status code and optional details.
 */
export class RepositoryException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly details?: any,
  ) {
    super(
      {
        statusCode,
        message,
        details,
      },
      statusCode,
    );
  }
}
