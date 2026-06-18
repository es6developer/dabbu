import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const env = process.env.EXPO_PUBLIC_APP_ENV || 'development';

export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env,
    enableTracing: true,
    tracesSampleRate: env === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    release: `dabbu-mobile@${process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'}`,
    dist: String(process.env.EXPO_PUBLIC_BUILD_NUMBER || '1'),
    beforeSend(event) {
      if (event.exception) {
        const exceptionValue = event.exception.values?.[0];
        if (exceptionValue) {
          const type = exceptionValue.type || '';
          const value = exceptionValue.value || '';
          if (
            type.includes('AbortError') ||
            type.includes('NetworkError') ||
            value.includes('Network request failed') ||
            value.includes('LOAD_ERROR') ||
            value.includes('Error: cancelled')
          ) {
            return null;
          }
        }
      }
      return event;
    },
  });
}
