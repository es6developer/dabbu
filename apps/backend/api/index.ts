import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from '../dist/app.module';
import { AllExceptionsFilter } from '../dist/common/filters/http-exception.filter';
import { TransformInterceptor } from '../dist/common/interceptors/transform.interceptor';

let cachedApp: express.Express;

async function bootstrap() {
  const expressApp = express();
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    bodyParser: false,
  });

  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return expressApp;
}

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    try {
      cachedApp = await bootstrap();
    } catch (err) {
      console.error('NestJS bootstrap failed:', err);
      res.status(500).json({ error: 'Bootstrap failed', message: (err as Error).message });
      return;
    }
  }
  return cachedApp(req, res);
}
