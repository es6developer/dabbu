import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const resObj = res as any;
        message = resObj.message || resObj.error || exception.message;
        code = resObj.code || `HTTP_${status}`;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaMapping = this.mapPrismaError(exception);
      status = prismaMapping.status;
      message = prismaMapping.message;
      code = prismaMapping.code;
      this.logger.warn(`Prisma error: ${exception.code} - ${exception.message}`);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `Server error: ${Array.isArray(message) ? message.join(', ') : message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      this.reportToSentry(exception, request);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'] || undefined,
    });
  }

  private mapPrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): { status: number; message: string; code: string } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          code: 'UNIQUE_CONSTRAINT',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          code: 'FOREIGN_KEY_CONSTRAINT',
        };
      default:
        this.logger.warn(`Unmapped Prisma error code: ${error.code}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          code: 'DATABASE_ERROR',
        };
    }
  }

  private reportToSentry(exception: unknown, _request: Request): void {
    try {
      const Sentry = require('@sentry/node') as {
        captureException: (e: unknown) => void;
        withScope: (cb: (scope: { setExtra: (k: string, v: unknown) => void; setTag: (k: string, v: string) => void }) => void) => void;
      };
      Sentry.withScope((scope) => {
        scope.setExtra('path', _request.url);
        scope.setExtra('method', _request.method);
        scope.setTag('source', 'exception-filter');
        Sentry.captureException(exception);
      });
    } catch {
      // Sentry not available
    }
  }
}
