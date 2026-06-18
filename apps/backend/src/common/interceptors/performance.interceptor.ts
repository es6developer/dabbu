import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

const SLOW_THRESHOLD = 300;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const start = Date.now();
    const requestId = uuidv4().slice(0, 8);

    request['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode;

        response.setHeader('X-Response-Time', `${duration}ms`);

        if (duration > SLOW_THRESHOLD) {
          this.logger.warn(`SLOW ${method} ${url} ${statusCode} ${duration}ms`);

          if (process.env.SENTRY_DSN) {
            try {
              const Sentry = require('@sentry/node');
              Sentry.captureMessage(`Slow request: ${method} ${url} (${duration}ms)`, 'warning');
            } catch {
              // Sentry not available
            }
          }
        } else {
          this.logger.log(`${method} ${url} ${statusCode} ${duration}ms`);
        }
      }),
    );
  }
}
