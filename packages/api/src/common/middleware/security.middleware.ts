import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Middleware
 *
 * Provides additional security measures:
 * - Request sanitization
 * - Prototype pollution prevention
 * - Security headers (supplement to helmet)
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query) as any;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeObject(req.params) as any;
    }

    // Add additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()'
    );
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    next();
  }

  /**
   * Recursively sanitize an object
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Prevent prototype pollution attacks
      if (
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      ) {
        this.logger.warn(`Blocked prototype pollution attempt: ${key}`);
        continue;
      }

      // Sanitize key and value
      const sanitizedKey = this.sanitizeKey(key);
      sanitized[sanitizedKey] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  /**
   * Sanitize a primitive value
   */
  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove null bytes (can cause issues in C-based systems)
    let sanitized = value.replace(/\0/g, '');

    // Remove potential script injection patterns
    // Note: This is defense-in-depth; class-validator should handle validation
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    return sanitized;
  }

  /**
   * Sanitize object keys
   */
  private sanitizeKey(key: string): string {
    // Remove any characters that could be problematic
    // Allow: alphanumeric, underscore, hyphen, period
    return key.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  }
}

/**
 * Request ID Middleware
 *
 * Ensures every request has a unique identifier for tracing
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Use existing request ID or generate new one
    const requestId =
      req.headers['x-request-id'] ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    req.headers['x-request-id'] = requestId as string;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}

/**
 * IP Extraction Middleware
 *
 * Extracts real client IP from proxy headers
 */
@Injectable()
export class IpExtractionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Get real IP from proxy headers (in order of preference)
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs; take the first one
      const ips = (forwardedFor as string).split(',').map((ip) => ip.trim());
      (req as any).realIp = ips[0];
    } else if (realIp) {
      (req as any).realIp = realIp;
    } else {
      (req as any).realIp = req.ip;
    }

    next();
  }
}
