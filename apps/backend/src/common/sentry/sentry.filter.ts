import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      success: false,
      message: typeof message === 'string' ? message : (message as Record<string, unknown>).message || 'Internal server error',
      code: status >= 500 ? 'INTERNAL_ERROR' : this.getErrorCode(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'] || undefined,
    };

    response.status(status).json(errorResponse);

    // Log server errors
    if (status >= 500) {
      console.error('Unhandled exception:', {
        message: exception instanceof Error ? exception.message : 'Unknown error',
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.url,
        method: request.method,
      });
    }
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      default: return 'INTERNAL_ERROR';
    }
  }
}
