import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { ServerlessAppModule } from './serverless-app.module';

let cachedApp: express.Express;

async function bootstrap() {
  const expressApp = express();
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const app = await NestFactory.create(ServerlessAppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    bodyParser: false,
  });

  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

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
