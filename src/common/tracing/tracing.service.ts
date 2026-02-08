import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * OpenTelemetry tracing setup for NestJS.
 *
 * When the OpenTelemetry SDK packages are installed, full distributed tracing
 * is enabled with OTLP export. Otherwise, tracing is gracefully skipped.
 *
 * Required packages (optional):
 *   npm install @opentelemetry/sdk-node @opentelemetry/sdk-trace-node
 *   npm install @opentelemetry/exporter-trace-otlp-grpc
 *   npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express
 *   npm install @opentelemetry/resources @opentelemetry/semantic-conventions
 */

function tryRequire(mod: string): any | null {
  try {
    return require(mod);
  } catch {
    return null;
  }
}

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TracingService.name);
  private sdk: any = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const enabled = process.env.OTEL_TRACING_ENABLED !== 'false';
    if (!enabled) {
      this.logger.log('OpenTelemetry tracing disabled.');
      return;
    }

    const sdkNode = tryRequire('@opentelemetry/sdk-node');
    const sdkTrace = tryRequire('@opentelemetry/sdk-trace-node');
    const otelResources = tryRequire('@opentelemetry/resources');
    const semconv = tryRequire('@opentelemetry/semantic-conventions');

    if (!sdkNode || !sdkTrace || !otelResources || !semconv) {
      this.logger.log(
        'OpenTelemetry SDK not installed — tracing disabled. ' +
          'Install with: npm install @opentelemetry/sdk-node @opentelemetry/sdk-trace-node ' +
          '@opentelemetry/resources @opentelemetry/semantic-conventions',
      );
      return;
    }

    try {
      const resource = new otelResources.Resource({
        [semconv.ATTR_SERVICE_NAME]: 'audit-assistant-api',
        [semconv.ATTR_SERVICE_VERSION]: '0.1.0',
      });

      let spanProcessor: any;
      const otlpEndpoint = process.env.OTLP_ENDPOINT;

      if (otlpEndpoint) {
        const otlpExporter = tryRequire('@opentelemetry/exporter-trace-otlp-grpc');
        if (otlpExporter) {
          const exporter = new otlpExporter.OTLPTraceExporter({ url: otlpEndpoint });
          spanProcessor = new sdkTrace.BatchSpanProcessor(exporter);
          this.logger.log(`OTLP trace exporter configured: ${otlpEndpoint}`);
        } else {
          this.logger.warn(
            'OTLP exporter not available, falling back to console exporter.',
          );
          spanProcessor = new sdkTrace.SimpleSpanProcessor(
            new sdkTrace.ConsoleSpanExporter(),
          );
        }
      } else {
        spanProcessor = new sdkTrace.SimpleSpanProcessor(
          new sdkTrace.ConsoleSpanExporter(),
        );
      }

      const instrumentations: any[] = [];
      const httpInstr = tryRequire('@opentelemetry/instrumentation-http');
      const expressInstr = tryRequire('@opentelemetry/instrumentation-express');
      if (httpInstr) instrumentations.push(new httpInstr.HttpInstrumentation());
      if (expressInstr) instrumentations.push(new expressInstr.ExpressInstrumentation());

      if (instrumentations.length === 0) {
        this.logger.warn(
          'OTel HTTP/Express instrumentations not installed — skipping auto-instrumentation.',
        );
      }

      this.sdk = new sdkNode.NodeSDK({
        resource,
        spanProcessor,
        instrumentations,
      });

      await this.sdk.start();
      this.logger.log('OpenTelemetry tracing initialized for audit-assistant-api');
    } catch (err) {
      this.logger.warn(
        `OpenTelemetry tracing init failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.logger.log('OpenTelemetry tracing shut down.');
    }
  }
}
