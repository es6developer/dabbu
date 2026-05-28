import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  Logger, HttpException, HttpStatus,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, catchError, tap } from 'rxjs/operators';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
  ],
};

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RetryInterceptor.name);
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attempt) => {
            if (attempt >= this.config.maxRetries) {
              return throwError(() => error);
            }

            const status = error instanceof HttpException ? error.getStatus() : 500;
            if (!this.config.retryableStatuses.includes(status)) {
              return throwError(() => error);
            }

            const delay = Math.min(
              this.config.baseDelay * Math.pow(2, attempt),
              this.config.maxDelay,
            );

            const request = context.switchToHttp().getRequest();
            this.logger.warn(
              `Retrying ${request.method} ${request.url} - Attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`,
            );

            return timer(delay);
          }),
        ),
      ),
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        this.logger.error(
          `Request failed after ${this.config.maxRetries} retries: ${request.method} ${request.url}`,
          error.stack,
        );
        return throwError(() => error);
      }),
    );
  }
}
