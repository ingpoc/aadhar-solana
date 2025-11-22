import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../services/cache.service';
import { RateLimitExceededException } from '../exceptions/api.exception';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor?.value || target);
    return descriptor || target;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get rate limit options from decorator or use defaults
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    ) || {};

    const windowMs = options.windowMs || this.configService.get('rateLimit.windowMs') || 60000;
    let maxRequests = options.maxRequests || this.configService.get('rateLimit.maxRequests') || 100;
    const keyPrefix = options.keyPrefix || 'rate';

    // Check if user has API key (higher limits)
    if (request.user?.isApiKey) {
      const multiplier = this.configService.get('rateLimit.apiKeyMultiplier') || 10;
      maxRequests *= multiplier;
    }

    // Generate rate limit key
    const identifier = this.getIdentifier(request);
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    const key = `${keyPrefix}:${identifier}:${endpoint}`;

    // Check rate limit
    const result = await this.checkRateLimit(key, windowMs, maxRequests);

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result.count));
    response.setHeader('X-RateLimit-Reset', result.resetTime);

    if (result.exceeded) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      response.setHeader('Retry-After', retryAfter);
      throw new RateLimitExceededException(retryAfter);
    }

    return true;
  }

  private getIdentifier(request: any): string {
    // Priority: API key > User ID > IP
    if (request.headers['x-api-key']) {
      return `apikey:${request.headers['x-api-key'].slice(0, 16)}`;
    }
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    return `ip:${request.ip || 'unknown'}`;
  }

  private async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<{ count: number; exceeded: boolean; resetTime: number }> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = windowStart + windowMs;
    const windowKey = `${key}:${windowStart}`;

    try {
      const count = await this.cacheService.increment(windowKey, windowMs / 1000);

      return {
        count,
        exceeded: count > maxRequests,
        resetTime,
      };
    } catch (error) {
      // If cache fails, allow request but log
      this.logger.warn(`Rate limit check failed: ${error.message}`);
      return {
        count: 0,
        exceeded: false,
        resetTime,
      };
    }
  }
}
