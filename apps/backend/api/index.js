let appHandler;

function isHealthRequest(url) {
  return url === '/api/v1/health' || url === '/health';
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error('Stack:', err.stack);
});

async function loadApp() {
  console.log('loadApp: starting...');
  const path = require('path');
  const express = require('express');
  require('reflect-metadata');

  const distPath = path.resolve(__dirname, '..', 'dist');

  try {
    console.log('loadApp: resolving distPath:', distPath);

    try {
      const fs = require('fs');
      const files = fs.readdirSync(distPath).slice(0, 20);
      console.log('loadApp: dist contents (first 20):', files.join(', '));
    } catch (e) {
      console.error('loadApp: cannot read dist dir:', e.message);
    }

    console.log('loadApp: loading @nestjs/core...');
    const { NestFactory } = require('@nestjs/core');
    console.log('loadApp: loading @nestjs/platform-express...');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    console.log('loadApp: loading @nestjs/common...');
    const { ValidationPipe } = require('@nestjs/common');

    console.log('loadApp: loading AppModule...');
    const { AppModule } = require(path.join(distPath, 'app.module'));
    console.log('loadApp: loading filters...');
    const { AllExceptionsFilter } = require(
      path.join(distPath, 'common/filters/http-exception.filter'),
    );
    console.log('loadApp: loading interceptors...');
    const { TransformInterceptor } = require(
      path.join(distPath, 'common/interceptors/transform.interceptor'),
    );

    const expressApp = express();
    expressApp.use(express.json({ limit: '50mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

    console.log('loadApp: creating NestJS app...');
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bufferLogs: true,
      bodyParser: false,
    });

    app.enableCors({ origin: '*', credentials: true });
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    console.log('loadApp: initializing NestJS...');
    await app.init();
    console.log('loadApp: NestJS initialized successfully');
    return expressApp;
  } catch (err) {
    console.error('loadApp: FAILED:', err.message);
    console.error('loadApp: Stack:', err.stack);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    if (isHealthRequest(req.url)) {
      return res
        .status(200)
        .json({ status: 'ok', mode: 'bootstrap', timestamp: new Date().toISOString() });
    }

    if (!appHandler) {
      appHandler = await loadApp();
    }

    if (appHandler) {
      console.log('handler: forwarding request to NestJS:', req.url);
      return appHandler(req, res);
    }

    res.status(200).json({ status: 'degraded', message: 'NestJS not initialized', url: req.url });
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.error('Stack:', err.stack);
    try {
      res.status(500).json({ status: 'error', error: err.message });
    } catch (_) {}
  }
};
