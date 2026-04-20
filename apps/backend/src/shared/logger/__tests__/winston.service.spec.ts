import { Test } from '@nestjs/testing';
import { WinstonLoggerService } from '../winston.service';

describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WinstonLoggerService],
    }).compile();

    service = module.get<WinstonLoggerService>(WinstonLoggerService);
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all logger methods', () => {
      expect(service.fatal).toBeDefined();
      expect(service.error).toBeDefined();
      expect(service.warn).toBeDefined();
      expect(service.log).toBeDefined();
      expect(service.debug).toBeDefined();
      expect(service.verbose).toBeDefined();
    });
  });

  describe('log levels', () => {
    it('should have fatal method', () => {
      expect(() => service.fatal('Fatal error', { test: true })).not.toThrow();
    });

    it('should have error method', () => {
      expect(() => service.error('Error message', 'Context')).not.toThrow();
    });

    it('should have warn method', () => {
      expect(() => service.warn('Warning message')).not.toThrow();
    });

    it('should have log (info) method', () => {
      expect(() => service.log('Info message', 'Context')).not.toThrow();
    });

    it('should have debug method', () => {
      expect(() => service.debug('Debug message', 'Context')).not.toThrow();
    });

    it('should have verbose method', () => {
      expect(() => service.verbose('Verbose message')).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      expect(() => service.error('Error occurred', 'Context', error)).not.toThrow();
    });

    it('should handle error without context', () => {
      expect(() => service.error('Simple error')).not.toThrow();
    });

    it('should handle error with metadata', () => {
      expect(() => service.error('Error with meta', 'Context', { userId: 123 })).not.toThrow();
    });
  });

  describe('metadata handling', () => {
    it('should accept metadata in log method', () => {
      expect(() => service.log('Message', 'Context', { key: 'value' })).not.toThrow();
    });

    it('should accept metadata in warn method', () => {
      expect(() => service.warn('Warning', 'Context', { key: 'value' })).not.toThrow();
    });

    it('should accept metadata in debug method', () => {
      expect(() => service.debug('Debug', 'Context', { key: 'value' })).not.toThrow();
    });
  });

  describe('context handling', () => {
    it('should work with context', () => {
      expect(() => service.log('Message', 'MyContext')).not.toThrow();
    });

    it('should work without context', () => {
      expect(() => service.log('Message')).not.toThrow();
    });
  });
});
