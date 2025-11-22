import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    // Set request ID in response headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      map((data) => {
        // If data already has our format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Check if data includes pagination info
        const isPaginated = data && typeof data === 'object' && 'items' in data && 'total' in data;

        const successResponse: ApiSuccessResponse<T> = {
          success: true,
          data: isPaginated ? data.items : data,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };

        // Add pagination metadata if available
        if (isPaginated) {
          const page = parseInt(request.query.page) || 1;
          const limit = parseInt(request.query.limit) || 20;
          successResponse.meta.pagination = {
            page,
            limit,
            total: data.total,
            totalPages: Math.ceil(data.total / limit),
          };
        }

        return successResponse;
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
