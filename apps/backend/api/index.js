module.exports = async (req, res) => {
  try {
    const path = require('path');
    const express = require('express');
    require('reflect-metadata');
    const { NestFactory } = require('@nestjs/core');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    const { ValidationPipe } = require('@nestjs/common');

    const distPath = path.resolve(__dirname, '..', 'dist');
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
    return expressApp(req, res);
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.error('Stack:', err.stack);
    if (req.url === '/api/v1/health') {
      return res.status(200).json({
        status: 'degraded',
        error: err.message,
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      stack: err.stack,
    });
  }
};
