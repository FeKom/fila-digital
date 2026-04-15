import fastify from "fastify";
import * as Sentry from "@sentry/node";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import { dbCircuitBreaker } from "./utils/circuit-breaker";
import registerCommerceRoutes from "./infra/routes/commerce";
import registerHealthRoute from "./infra/routes/health";
import config from "./infra/config";
import registerUserRoutes from "./infra/routes/user";
import { verifyToken } from "./utils/token";
import { Server, ServerRequest } from "./infra/types";
import registerQueueRoutes from "./infra/routes/queue";
import registerQueueParticipantsRoutes from "./infra/routes/participants-queue";
import gracefulShutdown from "fastify-graceful-shutdown";
import { db } from "./infra/database/connect";
import compress from "@fastify/compress";
import { uuidv7 } from "uuidv7";
// ─────────────────────────────────────────────────────────────────────────────
// Sentry — must be initialised before any routes or other imports that could
// throw. When SENTRY_DSN is not set (e.g. local dev / test), the SDK runs in
// a no-op mode so no code changes are needed in other files.
// ─────────────────────────────────────────────────────────────────────────────
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture 10 % of transactions for performance monitoring.
  // Increase to 1.0 temporarily when profiling a specific issue.
  tracesSampleRate: 0.1,

  // Human-readable environment tag visible in the Sentry dashboard.
  environment: process.env.NODE_ENV ?? "development",

  // Release tag — GitHub Actions injects the short SHA via GITHUB_SHA.
  // Falls back gracefully when not running in CI.
  release: process.env.GITHUB_SHA
    ? `fila-digital@${process.env.GITHUB_SHA.slice(0, 7)}`
    : undefined,

  // Ignore noise that is not actionable.
  ignoreErrors: ["Not found", "Unauthorized", "No rows returned"],
});

const setupV1Routes = (server: Server) => {
  registerUserRoutes(server);
  registerCommerceRoutes(server);
  registerQueueRoutes(server);
  registerQueueParticipantsRoutes(server);
};

export const initServer = async () => {
  const logLevel = config.get<string>("logging.level");
  const server = fastify({
    genReqId: () => uuidv7(),
    logger: { level: logLevel },
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    // Required for req.ip to resolve correctly behind Traefik + Cloudflare.
    trustProxy: true,
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Global default: write limit (60 req/min). Individual routes override this
  // via `config.rateLimit` — see src/infra/routes/*.ts.
  // trustProxy must be true so req.ip resolves to the real client IP when
  // running behind Traefik + Cloudflare (X-Forwarded-For / CF-Connecting-IP).
  await server.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (req) =>
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}.`,
      retryAfter: context.after,
    }),
    // Add standard rate-limit headers to every response so clients can
    // implement back-off without guessing.
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });

  server.register(gracefulShutdown);
  server.after(() => {
    server.gracefulShutdown(async (signal) => {
      server.log.info(`Received signal to terminate: ${signal}`);
      await Sentry.close(2000);
      await db.destroy();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      server.log.info("Cleanup completed. Shutting down.");
    });
  });

  server.register(compress, { global: true });

  // ── OpenAPI spec + Scalar docs UI ──────────────────────────────────────────
  await server.register(swagger, {
    openapi: {
      info: {
        title: "Fila Digital API",
        description: "API para gerenciamento de filas digitais",
        version: "0.2.0",
      },
      servers: [{ url: "http://localhost:7070", description: "Local" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await server.register(scalar, {
    routePrefix: "/docs",
  });

  // Infra endpoints — no version prefix
  registerHealthRoute(server);

  // API v1
  server.register(
    async (v1) => {
      setupV1Routes(v1 as Server);
    },
    { prefix: "/v1" }
  );

  // ── Circuit breaker ────────────────────────────────────────────────────────
  // onRequest: if the DB circuit is OPEN (or the HALF_OPEN probe slot is
  // busy), reject immediately with 503 — no controller code runs, no DB hit.
  // /healthcheck is always exempt so UptimeRobot keeps working.
  server.addHook("onRequest", async (request, reply) => {
    if (request.url === "/healthcheck") return;

    if (!dbCircuitBreaker.attempt()) {
      const { retryInMs } = dbCircuitBreaker.status;
      const retryAfterSecs =
        retryInMs != null ? Math.ceil(retryInMs / 1000) : 30;

      reply.header("Retry-After", String(retryAfterSecs));
      return reply.code(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message:
          "The service is temporarily unavailable. Please try again shortly.",
        retryAfter: `${retryAfterSecs}s`,
      });
    }
  });

  // onSend: observe every response that made it through and update the
  // circuit breaker state accordingly.
  //   5xx → recordFailure  (server / DB error)
  //   anything else → recordSuccess  (4xx are client errors, not DB failures)
  // /healthcheck is skipped — probing the DB from the health endpoint should
  // not influence the circuit state.
  server.addHook("onSend", async (request, _reply, payload) => {
    if (request.url === "/healthcheck") return payload;

    const status = _reply.statusCode;
    if (status >= 500) {
      dbCircuitBreaker.recordFailure();
    } else {
      dbCircuitBreaker.recordSuccess();
    }

    return payload;
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  server.addHook("preHandler", async (request, reply) => {
    const PUBLIC_PATHS = [
      "/v1/user/login",
      "/v1/user/register",
      "/v1/enter-queue",
      "/docs",
      "/healthcheck",
    ];
    const isPublicPath = () =>
      PUBLIC_PATHS.some((path) => request.url.startsWith(path));

    if (!isPublicPath()) {
      verifyToken(request as ServerRequest, reply);
    }
  });

  // ── Sentry error hook ──────────────────────────────────────────────────────
  // Captures every unhandled error that reaches Fastify's error boundary.
  // This runs after your own try/catch blocks, so it only fires for truly
  // unexpected exceptions (database pool exhausted, bug in middleware, etc.).
  server.addHook("onError", (request, _reply, error, done) => {
    Sentry.withScope((scope) => {
      // Attach request metadata so the Sentry event has full context.
      scope.setTag("method", request.method);
      scope.setTag("url", request.url);
      scope.setTag("routerPath", request.routeOptions?.url ?? "unknown");

      // Attach the authenticated user when available.
      const user = (request as ServerRequest).user;
      if (user) {
        scope.setUser({ id: user.id });
      }

      // Attach the Fastify request ID for cross-referencing with Loki logs.
      scope.setExtra("requestId", request.id);

      Sentry.captureException(error);
    });

    done();
  });

  const port = config.get<number>("server.port") || 7070;
  server.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
      Sentry.captureException(err);
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`Server listening at ${address}`);
  });
};
