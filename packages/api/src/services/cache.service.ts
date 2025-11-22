import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db') || 0;

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed, running without cache');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`Redis connected: ${host}:${port}`);
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    try {
      await this.redis.connect();
    } catch (error) {
      this.logger.warn('Redis unavailable, running without cache');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error: ${error.message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache pattern invalidation error: ${error.message}`);
    }
  }

  // Rate limiting support
  async increment(key: string, ttlSeconds: number = 60): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, ttlSeconds);
      const results = await multi.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      this.logger.error(`Cache increment error: ${error.message}`);
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      return false;
    }
  }

  // Set with NX (only if not exists)
  async setNx(key: string, value: any, ttl: number): Promise<boolean> {
    if (!this.isConnected) return true;

    try {
      const result = await this.redis.set(key, JSON.stringify(value), 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Cache setNx error: ${error.message}`);
      return true;
    }
  }

  // Hash operations for complex data
  async hSet(key: string, field: string, value: any): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.hset(key, field, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Cache hSet error: ${error.message}`);
    }
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache hGet error: ${error.message}`);
      return null;
    }
  }

  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    if (!this.isConnected) return {};

    try {
      const data = await this.redis.hgetall(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      this.logger.error(`Cache hGetAll error: ${error.message}`);
      return {};
    }
  }

  isAvailable(): boolean {
    return this.isConnected;
  }
}
