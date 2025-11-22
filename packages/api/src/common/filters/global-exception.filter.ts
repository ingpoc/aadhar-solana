import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException, ApiErrorResponse } from '../exceptions/api.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'] as string || this.generateRequestId();

    let status: HttpStatus;
    let errorResponse: ApiErrorResponse;

    if (exception instanceof ApiException) {
      // Our custom API exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as ApiErrorResponse;
      errorResponse = {
        ...exceptionResponse,
        error: {
          ...exceptionResponse.error,
          requestId,
        },
      };
    } else if (exception instanceof HttpException) {
      // NestJS built-in exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        success: false,
        error: {
          code: this.getErrorCode(status),
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || 'An error occurred',
          details: typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
    } else if (exception instanceof Error) {
      // Generic errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : exception.message,
          requestId,
          timestamp: new Date().toISOString(),
        },
      };

      // Log the full error in non-production
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      // Unknown error type
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Log the error
    this.logError(request, status, errorResponse, exception);

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: HttpStatus): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.GONE]: 'GONE',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(
    request: Request,
    status: number,
    errorResponse: ApiErrorResponse,
    exception: unknown,
  ): void {
    const logData = {
      requestId: errorResponse.error.requestId,
      method: request.method,
      url: request.url,
      status,
      errorCode: errorResponse.error.code,
      message: errorResponse.error.message,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id,
    };

    if (status >= 500) {
      this.logger.error(
        `Server Error: ${JSON.stringify(logData)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`Client Error: ${JSON.stringify(logData)}`);
    }
  }
}
