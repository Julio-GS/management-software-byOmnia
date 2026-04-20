import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    try {
      await service.$disconnect();
    } catch (error) {
      // Ignore disconnect errors in tests
    }
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend PrismaClient', () => {
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
      expect(service.$transaction).toBeDefined();
    });

    it('should have runInTransaction helper', () => {
      expect(service.runInTransaction).toBeDefined();
      expect(typeof service.runInTransaction).toBe('function');
    });

    it('should have enableSoftDelete placeholder', () => {
      expect(service.enableSoftDelete).toBeDefined();
      expect(typeof service.enableSoftDelete).toBe('function');
    });
  });

  describe('transaction helpers', () => {
    it('should execute callback within transaction', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      
      const result = await service.runInTransaction(callback);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(service.runInTransaction(callback)).rejects.toThrow('Transaction failed');
    });
  });

  describe('lifecycle', () => {
    it('should not throw on enableSoftDelete', () => {
      expect(() => service.enableSoftDelete()).not.toThrow();
    });
  });
});
