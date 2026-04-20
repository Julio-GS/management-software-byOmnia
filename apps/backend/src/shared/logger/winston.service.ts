import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Winston Logger Service
 * 
 * Structured JSON logger with log levels:
 * - Fatal: Critical system failures
 * - Error: Application errors
 * - Warn: Warning messages
 * - Info: General information (default)
 * - Debug: Debug messages
 * - Verbose: Detailed trace information
 * 
 * All logs include:
 * - timestamp (ISO 8601)
 * - level
 * - message
 * - context (optional)
 * - metadata (optional)
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'backend',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: false }), // No colors for JSON
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  /**
   * Fatal error (highest severity)
   */
  fatal(message: string, metadata?: any): void {
    this.logger.log('fatal', message, metadata);
  }

  /**
   * Error message
   */
  error(message: any, context?: string, metadata?: any): void {
    const meta: any = { context };

    if (metadata instanceof Error) {
      meta.error = {
        message: metadata.message,
        stack: metadata.stack,
        name: metadata.name,
      };
    } else if (metadata) {
      Object.assign(meta, metadata);
    }

    this.logger.error(message, meta);
  }

  /**
   * Warning message
   */
  warn(message: string, context?: string, metadata?: any): void {
    this.logger.warn(message, { context, ...metadata });
  }

  /**
   * Info message (default level)
   */
  log(message: string, context?: string, metadata?: any): void {
    this.logger.info(message, { context, ...metadata });
  }

  /**
   * Debug message
   */
  debug(message: string, context?: string, metadata?: any): void {
    this.logger.debug(message, { context, ...metadata });
  }

  /**
   * Verbose message (lowest severity)
   */
  verbose(message: string, context?: string, metadata?: any): void {
    this.logger.verbose(message, { context, ...metadata });
  }
}
