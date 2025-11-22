/**
 * CacheService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../services/cache.service';

// Mock ioredis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  multi: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'redis.host': 'localhost',
        'redis.port': 6379,
        'redis.password': undefined,
        'redis.db': 0,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Simulate connected state
    (service as any).isConnected = true;
    (service as any).redis = mockRedis;
  });

  describe('get', () => {
    it('should return cached value when exists', async () => {
      const testData = { id: '123', name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null when not connected', async () => {
      (service as any).isConnected = false;

      const result = await service.get('any-key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection error'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const testData = { id: '123' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', testData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600, // default TTL
        JSON.stringify(testData)
      );
    });

    it('should set value with custom TTL', async () => {
      const testData = { id: '456' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('custom-ttl-key', testData, 7200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'custom-ttl-key',
        7200,
        JSON.stringify(testData)
      );
    });

    it('should not set when not connected', async () => {
      (service as any).isConnected = false;

      await service.set('any-key', { data: 'test' });

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Write error'));

      // Should not throw
      await expect(service.set('error-key', { test: true })).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.del('key-to-delete');

      expect(mockRedis.del).toHaveBeenCalledWith('key-to-delete');
    });

    it('should not delete when not connected', async () => {
      (service as any).isConnected = false;

      await service.del('any-key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedis.del.mockResolvedValue(3);

      await service.invalidatePattern('user:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
    });

    it('should handle empty pattern results', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.invalidatePattern('nonexistent:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should not invalidate when not connected', async () => {
      (service as any).isConnected = false;

      await service.invalidatePattern('any:*');

      expect(mockRedis.keys).not.toHaveBeenCalled();
    });
  });

  describe('increment', () => {
    it('should increment counter with TTL', async () => {
      const mockMulti = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 5], [null, 1]]),
      };
      mockRedis.multi.mockReturnValue(mockMulti);

      const result = await service.increment('rate:limit:user1', 60);

      expect(result).toBe(5);
      expect(mockMulti.incr).toHaveBeenCalledWith('rate:limit:user1');
      expect(mockMulti.expire).toHaveBeenCalledWith('rate:limit:user1', 60);
    });

    it('should return 0 when not connected', async () => {
      (service as any).isConnected = false;

      const result = await service.increment('any-key');

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists('existing-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists('non-existing-key');

      expect(result).toBe(false);
    });

    it('should return false when not connected', async () => {
      (service as any).isConnected = false;

      const result = await service.exists('any-key');

      expect(result).toBe(false);
    });
  });

  describe('setNx', () => {
    it('should return true when key is set (did not exist)', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.setNx('new-key', { data: 'test' }, 3600);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'new-key',
        JSON.stringify({ data: 'test' }),
        'EX',
        3600,
        'NX'
      );
    });

    it('should return false when key already exists', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.setNx('existing-key', { data: 'test' }, 3600);

      expect(result).toBe(false);
    });

    it('should return true when not connected (allow operation)', async () => {
      (service as any).isConnected = false;

      const result = await service.setNx('any-key', { data: 'test' }, 3600);

      expect(result).toBe(true);
    });
  });

  describe('hash operations', () => {
    describe('hSet', () => {
      it('should set hash field', async () => {
        mockRedis.hset.mockResolvedValue(1);

        await service.hSet('hash-key', 'field1', { name: 'test' });

        expect(mockRedis.hset).toHaveBeenCalledWith(
          'hash-key',
          'field1',
          JSON.stringify({ name: 'test' })
        );
      });
    });

    describe('hGet', () => {
      it('should get hash field value', async () => {
        mockRedis.hget.mockResolvedValue(JSON.stringify({ name: 'test' }));

        const result = await service.hGet<{ name: string }>('hash-key', 'field1');

        expect(result).toEqual({ name: 'test' });
      });

      it('should return null for non-existent field', async () => {
        mockRedis.hget.mockResolvedValue(null);

        const result = await service.hGet('hash-key', 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('hGetAll', () => {
      it('should get all hash fields', async () => {
        mockRedis.hgetall.mockResolvedValue({
          field1: JSON.stringify({ name: 'test1' }),
          field2: JSON.stringify({ name: 'test2' }),
        });

        const result = await service.hGetAll<{ name: string }>('hash-key');

        expect(result).toEqual({
          field1: { name: 'test1' },
          field2: { name: 'test2' },
        });
      });

      it('should return empty object when not connected', async () => {
        (service as any).isConnected = false;

        const result = await service.hGetAll('any-key');

        expect(result).toEqual({});
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when connected', () => {
      (service as any).isConnected = true;

      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when not connected', () => {
      (service as any).isConnected = false;

      expect(service.isAvailable()).toBe(false);
    });
  });
});
