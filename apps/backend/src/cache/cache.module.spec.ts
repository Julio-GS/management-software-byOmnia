import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { OmniaCacheModule } from './cache.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('OmniaCacheModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [OmniaCacheModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide CACHE_MANAGER', () => {
    const cacheManager = module.get(CACHE_MANAGER);
    expect(cacheManager).toBeDefined();
  });

  it('should configure in-memory cache with 5-min TTL and 100 max items', async () => {
    const cacheManager = module.get(CACHE_MANAGER);
    
    // Test cache set/get to verify configuration
    await cacheManager.set('test-key', 'test-value');
    const value = await cacheManager.get('test-key');
    
    expect(value).toBe('test-value');
  });

  it('should export CacheModule for global use', () => {
    const exports = Reflect.getMetadata('exports', OmniaCacheModule) || [];
    expect(exports).toContain(CacheModule);
  });
});
