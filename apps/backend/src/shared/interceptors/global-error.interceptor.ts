import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BusinessException } from '../exceptions/business.exception';
import { TechnicalException } from '../exceptions/technical.exception';

/**
 * Global Error Interceptor
 * 
 * Transforms all exceptions to structured JSON responses with:
 * - statusCode: HTTP status code
 * - message: Human-readable error message
 * - code: Machine-readable error code
 * - details: Optional additional context (only in non-production for TechnicalException)
 * - timestamp: ISO 8601 timestamp
 * - path: Request path
 * - method: HTTP method
 */
@Injectable()
export class GlobalErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal Server Error';
        let code = 'INTERNAL_ERROR';
        let details: any = undefined;

        // Handle BusinessException
        if (error instanceof BusinessException) {
          statusCode = error.statusCode;
          message = error.message;
          code = error.code;
          details = error.details;
        }
        // Handle TechnicalException
        else if (error instanceof TechnicalException) {
          statusCode = error.statusCode;
          message = error.message;
          code = error.code;
          details = error.details;
        }
        // Handle standard HttpException
        else if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const errorResponse = error.getResponse();

          if (typeof errorResponse === 'string') {
            message = errorResponse;
          } else if (typeof errorResponse === 'object' && errorResponse !== null) {
            message = (errorResponse as any).message || message;
          }

          code = 'HTTP_EXCEPTION';
        }
        // Handle unknown errors
        else {
          // Keep defaults: 500, 'Internal Server Error', 'INTERNAL_ERROR'
        }

        const errorResponse: any = {
          statusCode,
          message,
          code,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };

        // Include details only if present
        if (details !== undefined) {
          errorResponse.details = details;
        }

        return throwError(() => new HttpException(errorResponse, statusCode));
      }),
    );
  }
}
