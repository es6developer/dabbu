import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status < 500) {
        return super.catch(exception, host);
      }
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node');
      Sentry.captureException(exception);
    } catch {
      /* Sentry not available */
    }
    super.catch(exception, host);
  }
}
