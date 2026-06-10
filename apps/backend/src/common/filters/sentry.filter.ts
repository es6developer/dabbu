import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status < 500) {
        return super.catch(exception, host);
      }
    }
    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
