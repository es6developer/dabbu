import { registerAs } from '@nestjs/config';

export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  enableTracing: process.env.SENTRY_ENABLE_TRACING === 'true',
}));
