export function initTelemetry(_serviceName = 'dabbu-api') {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return;
  }

  try {
    // Dynamic require to avoid loading issues in monorepo
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NestInstrumentation } = require('@opentelemetry/instrumentation-nestjs-core');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resource } = require('@opentelemetry/resources');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: _serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
      instrumentations: [
        getNodeAutoInstrumentations(),
        new NestInstrumentation(),
        new ExpressInstrumentation(),
      ],
    });

    sdk.start();
    process.on('SIGTERM', () => sdk.shutdown().catch(() => {}));
  } catch {
    // Telemetry is optional; silently skip if packages not available
  }
}
