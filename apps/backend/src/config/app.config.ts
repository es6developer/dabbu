import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: 'Dabbu API',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081').split(','),
  logLevel: process.env.LOG_LEVEL || 'debug',
  logDir: process.env.LOG_DIR || './logs',
  sentryDsn: process.env.SENTRY_DSN || '',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  swaggerPath: process.env.SWAGGER_PATH || 'docs',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  authThrottleLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT || '10', 10),
}));
