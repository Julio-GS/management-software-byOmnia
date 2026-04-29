import { Module, Global } from '@nestjs/common';
import { WinstonLoggerService } from './winston.service';

/**
 * Winston Logger Module
 * 
 * Provides structured JSON logging with Winston.
 * This is marked as @Global so it's available throughout the application.
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly logger: WinstonLoggerService) {}
 * 
 * this.logger.log('User created', 'UsersService', { userId: 123 });
 * this.logger.error('Failed to create user', 'UsersService', error);
 * ```
 */
@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class WinstonLoggerModule {}
