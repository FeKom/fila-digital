// ─────────────────────────────────────────────────────────────────────────────
// OpenTelemetry tracer — Fila Digital
//
// IMPORTANT: This file must be imported FIRST in src/index.ts, before any
// other import. The OTel SDK patches Node.js modules at load-time via
// require-in-the-middle — if any module is already loaded, its calls will
// not be instrumented. Keep it as the very first import.
//
// What gets auto-instrumented:
//   - Fastify HTTP requests → spans with method, route, status code
//   - pg (PostgreSQL)       → spans with db.statement, db.operation
//   - Node.js http/https    → outbound HTTP calls
//   - DNS lookups
//
// Trace destination:
//   OTEL_EXPORTER_OTLP_ENDPOINT env var → Grafana Tempo in production
//   When unset → disabled (no spans exported, zero overhead)
// ─────────────────────────────────────────────────────────────────────────────

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { FastifyOtelInstrumentation } from "@fastify/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import config from "config";

const endpoint = config.get<string>("otel.endpoint");

const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  registerOnInitialization: true,
});

if (!endpoint) {
  process.stdout.write(
    "[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled\n"
  );
} else {
  const options = {
    url: endpoint,
    compression: CompressionAlgorithm.GZIP,
  };

  const metricExporter = new OTLPMetricExporter(options);
  const traceExporter = new OTLPTraceExporter(options);

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
    exportTimeoutMillis: 10000,
  });

  const sdk = new NodeSDK({
    metricReader,
    traceExporter,

    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.get<string>("otel.serviceName"),
      [ATTR_SERVICE_VERSION]: process.env.GITHUB_SHA?.slice(0, 7) ?? "dev",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        // PostgreSQL — captures db.statement on every Kysely query
        // enhancedDatabaseReporting: false keeps bind values out of spans
        "@opentelemetry/instrumentation-pg": {
          enabled: true,
          enhancedDatabaseReporting: false,
        },
      }),
      fastifyOtelInstrumentation,
    ],
  });

  process.on("beforeExit", async () => {
    await sdk.shutdown();
  });

  sdk.start();
}
