/* eslint-disable @typescript-eslint/no-var-requires */
let appHandler;

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

async function loadApp() {
  const path = require('path');
  const distPath = path.resolve(__dirname, '..', 'dist');

  try {
    const express = require('express');
    require('reflect-metadata');
    const { NestFactory } = require('@nestjs/core');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    const { ValidationPipe } = require('@nestjs/common');
    const { AppModule } = require(path.join(distPath, 'app.module'));
    const { AllExceptionsFilter } = require(
      path.join(distPath, 'common/filters/http-exception.filter'),
    );
    const { TransformInterceptor } = require(
      path.join(distPath, 'common/interceptors/transform.interceptor'),
    );

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
  } catch (err) {
    console.error('loadApp error:', err.message, err.stack);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    if (req.url === '/api/v1/health' || req.url === '/health') {
      return res.status(200).json({ status: 'ok', mode: 'bootstrap' });
    }

    if (!appHandler) {
      appHandler = await loadApp();
    }

    if (appHandler) {
      return appHandler(req, res);
    }

    res.status(200).json({ status: 'degraded', message: 'NestJS not initialized', url: req.url });
  } catch (err) {
    console.error('Handler error:', err.message);
    try {
      res.status(500).json({ status: 'error', error: err.message });
    } catch (_) {}
  }
};
