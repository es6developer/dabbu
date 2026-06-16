import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SentryFilter } from './common/sentry/sentry.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/cache/cache.interceptor';
import { CacheService } from './common/cache/cache.service';
import { SecurityConfig } from './common/security/security.config';
import { initTelemetry } from './config/telemetry';

initTelemetry(process.env.SERVICE_NAME || 'dabbu-api');

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.use(compression({ level: 6, threshold: 512 }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const configService = app.get(ConfigService);
  const securityConfig = app.get(SecurityConfig);
  const port = configService.get<number>('app.port', 4000);
  const prefix = configService.get<string>('app.prefix', '/api/v1');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:8081');

  // ─── Sentry (dynamic import — optional dep) ─────────
  const sentryDsn = configService.get<string>('sentry.dsn', '');
  const sentryEnv = configService.get<string>('sentry.environment', 'development');
  const sentryTracesSampleRate = configService.get<number>('sentry.tracesSampleRate', 0.2);
  if (sentryDsn) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn: sentryDsn,
        environment: sentryEnv,
        tracesSampleRate: sentryTracesSampleRate,
      });
      logger.log('Sentry initialized');
    } catch (e) {
      logger.warn('Failed to initialize Sentry', (e as Error).message);
    }
  }

  // ─── Security ───────────────────────────────────────
  app.use(securityConfig.getHelmetConfig());
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
      'http://localhost:8081',
      'https://admin.dabbu.app',
      /\.vercel\.app$/,
      'https://app.dabbu.app',
      'https://external-web-es6developers-projects.vercel.app',
      'https://external-web.vercel.app',
      'https://dabbu-1ff9.onrender.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  // ─── Rate Limiting ──────────────────────────────────
  if (nodeEnv === 'production') {
    app.use(securityConfig.getRateLimiterConfig());
  }

  // ─── Global Prefix ──────────────────────────────────
  app.setGlobalPrefix(prefix);

  // ─── Global Pipes ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters ─────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter(), new SentryFilter());

  // ─── Global Interceptors ────────────────────────────
  app.useGlobalInterceptors(new CacheInterceptor(app.get(CacheService)), new LoggingInterceptor(), new TransformInterceptor());

  // ─── Swagger ────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dabbu API')
    .setDescription('Dabbu Personal Finance Manager - Complete REST API')
    .setVersion('1.0.0')
    .setContact('Dabbu Team', 'https://dabbu.app', 'support@dabbu.app')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(`http://localhost:${port}`, 'Local Development')
    .addServer('https://api.dabbu.app', 'Production')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKey')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ─── Shutdown hooks ─────────────────────────────────
  app.enableShutdownHooks();

  // ─── Start ──────────────────────────────────────────
  await app.listen(port, '0.0.0.0');
  logger.log(`Dabbu API running on http://localhost:${port}${prefix}`);
  logger.log(`Swagger docs at http://localhost:${port}${prefix}/docs`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap();
