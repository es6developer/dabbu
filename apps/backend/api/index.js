let appHandler;

async function loadApp() {
  const path = require('path');
  const express = require('express');
  require('reflect-metadata');

  const distPath = path.resolve(__dirname, '..', 'dist');
  console.log('distPath:', distPath);

  try {
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
    console.error('Failed to load NestJS app:', err.message);
    console.error('Stack:', err.stack);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    if (!appHandler) {
      appHandler = await loadApp();
    }
    if (appHandler) {
      return appHandler(req, res);
    }
    if (req.url === '/api/v1/health') {
      return res.status(200).json({ status: 'healthy', mode: 'fallback' });
    }
    res.status(200).json({ status: 'degraded', message: 'NestJS not initialized', url: req.url });
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.error('Stack:', err.stack);
    res.status(200).json({ status: 'error', error: err.message });
  }
};
