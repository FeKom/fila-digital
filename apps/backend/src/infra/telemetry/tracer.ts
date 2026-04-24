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
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!endpoint) {
  process.stdout.write(
    "[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing disabled\n"
  );
} else {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "fila-digital-api",
      [ATTR_SERVICE_VERSION]: process.env.GITHUB_SHA?.slice(0, 7) ?? "dev",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),

    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          enabled: true,
          // Skip healthcheck and metrics scrapes — high volume, low value
          ignoreIncomingRequestHook: (req) =>
            req.url === "/healthcheck" || req.url === "/metrics",
        },

        // PostgreSQL — captures db.statement on every Kysely query
        // enhancedDatabaseReporting: false keeps bind values out of spans
        "@opentelemetry/instrumentation-pg": {
          enabled: true,
          enhancedDatabaseReporting: false,
        },

        "@opentelemetry/instrumentation-dns": { enabled: true },

        // Disable unused framework instrumentations
        "@opentelemetry/instrumentation-express": { enabled: false },
        "@opentelemetry/instrumentation-koa": { enabled: false },
        "@opentelemetry/instrumentation-hapi": { enabled: false },
        "@opentelemetry/instrumentation-nestjs-core": { enabled: false },
        "@opentelemetry/instrumentation-graphql": { enabled: false },
        "@opentelemetry/instrumentation-grpc": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
