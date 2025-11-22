import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = headers['x-request-id'] || 'unknown';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    // Log request
    this.logger.log(
      JSON.stringify({
        type: 'request',
        requestId,
        method,
        url,
        ip,
        userAgent,
        userId,
        timestamp: new Date().toISOString(),
      }),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          // Log response
          this.logger.log(
            JSON.stringify({
              type: 'response',
              requestId,
              method,
              url,
              statusCode: response.statusCode,
              duration: `${duration}ms`,
              userId,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          // Log error response
          this.logger.error(
            JSON.stringify({
              type: 'error',
              requestId,
              method,
              url,
              error: error.message,
              duration: `${duration}ms`,
              userId,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
