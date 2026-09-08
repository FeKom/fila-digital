import fastify from "fastify";
import * as Sentry from "@sentry/node";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter as BullBoardFastifyAdapter } from "@bull-board/fastify";
import { dbCircuitBreaker } from "./utils/circuit-breaker";
import { getSchedulerQueue } from "./infra/bullmq";
import registerCommerceRoutes from "./infra/routes/commerce";
import registerHealthRoute from "./infra/routes/health";
import config from "./infra/config";
import registerUserRoutes from "./infra/routes/user";
import { verifyToken } from "./utils/token";
import { Server, ServerRequest } from "./infra/types";
import registerQueueRoutes from "./infra/routes/queue";
import registerQueueParticipantsRoutes from "./infra/routes/participants-queue";
import registerNotificationsRoutes from "./infra/routes/notifications";
import { initWebPush } from "./infra/push";
import gracefulShutdown from "fastify-graceful-shutdown";
import { db } from "./infra/database/connect";
import { closeRedis, getRedisClient } from "./infra/redis";
import { closeSchedulers } from "./workers/schedulerWorker";
import { shutdownTelemetry } from "./infra/telemetry/tracer";
import { markShuttingDown } from "./utils/lifecycle";
import { allowedOrigins } from "./utils/origins";
import compress from "@fastify/compress";
import { uuidv7 } from "uuidv7";
import ROUTES from "./constants";
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
  registerNotificationsRoutes(server);
};

// Janela entre falhar a readiness e começar a fechar conexões. Dá tempo do
// kube-proxy e do Traefik removerem o pod do balanceamento. Deve ser menor
// que o terminationGracePeriodSeconds do Deployment (sugerido: 30s).
const DRAIN_DELAY_MS = Number(process.env.DRAIN_DELAY_MS ?? 5000);

export const initServer = async () => {
  initWebPush();
  const logLevel = config.get<string>("logging.level");
  const lokiUrl = process.env.LOKI_URL;
  const isProduction = process.env.NODE_ENV === "production";

  // pino-pretty é devDependency: não existe na imagem de produção, onde o
  // node_modules é podado. Em produção o pino escreve JSON no stdout, que é o
  // que Loki e k8s consomem — sem transport nenhum quando não há LOKI_URL.
  const logTargets = [
    ...(isProduction
      ? []
      : [
          {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "dd/mm/yyyy HH:MM:ss",
              ignore: "pid,hostname",
            },
          },
        ]),
    ...(lokiUrl
      ? [
          {
            target: "pino-loki",
            options: {
              host: lokiUrl,
              labels: {
                app: "fila-digital-api",
                env: process.env.NODE_ENV ?? "development",
              },
              interval: 1,
              silenceErrors: true,
            },
          },
        ]
      : []),
  ];

  const server = fastify({
    genReqId: () => uuidv7(),
    logger: {
      level: logLevel,
      ...(logTargets.length > 0 ? { transport: { targets: logTargets } } : {}),
    },
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    // Required for req.ip to resolve correctly behind Traefik + Cloudflare.
    trustProxy: true,
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  // ALLOWED_ORIGIN aceita uma LISTA separada por virgula. Um valor unico nao
  // basta: o mesmo frontend e servido em mais de uma origem (apex, www e o
  // dominio da Vercel), e CORS exige correspondencia EXATA — "example.com" e
  // "www.example.com" sao origens distintas para o navegador.
  //
  // Autorizar so uma delas bloqueia silenciosamente todas as outras: o
  // preflight responde 204, mas o navegador descarta a resposta porque o
  // Access-Control-Allow-Origin nao bate com a origem da pagina.
  await server.register(cors, {
    origin: allowedOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Anonymous-Id",
      "Idempotency-Key",
    ],
    credentials: true,
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Global default: write limit (60 req/min). Individual routes override this
  // via `config.rateLimit` — see src/infra/routes/*.ts.
  // trustProxy must be true so req.ip resolves to the real client IP when
  // running behind Traefik + Cloudflare (X-Forwarded-For / CF-Connecting-IP).
  // Store compartilhado entre réplicas. Sem ele o @fastify/rate-limit guarda
  // os contadores em memória por processo: com 2 pods e balanceamento
  // round-robin o limite efetivo dobra. Isso importa mais no perfil `auth`
  // (10/min), cuja função é travar força bruta em login — 2 réplicas o
  // transformariam em 20/min.
  //
  // Reusa a conexão pub, que só emite comandos não-bloqueantes. Quando o
  // Redis não está configurado, o plugin volta ao contador em memória.
  const rateLimitRedis = getRedisClient();
  if (!rateLimitRedis) {
    server.log.warn(
      "[RateLimit] Redis indisponível — contadores em memória, limite por réplica"
    );
  }

  await server.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: "1 minute",
    ...(rateLimitRedis ? { redis: rateLimitRedis } : {}),
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

      // 1. Readiness passa a falhar → k8s remove o pod dos Endpoints do Service.
      markShuttingDown();

      // 2. Espera a remoção propagar por kube-proxy e Traefik antes de fechar
      //    qualquer coisa. O 1s anterior era curto demais: requisições em voo
      //    tomavam connection reset em todo deploy. Precisa ser menor que o
      //    terminationGracePeriodSeconds do manifest.
      await new Promise((resolve) => setTimeout(resolve, DRAIN_DELAY_MS));

      // 3. Drena jobs em execução antes de derrubar as conexões que eles usam.
      //    A ordem importa: fechar o banco antes do worker abortaria o job
      //    corrente no meio de uma transação.
      await closeSchedulers();
      await closeRedis();
      await db.destroy();

      // 4. Flush do OTEL por último, para que os spans do próprio shutdown saiam.
      await Sentry.close(2000);
      await shutdownTelemetry();

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

  // ── Bull Board — queue admin UI ────────────────────────────────────────────
  // Protected with HTTP Basic Auth. Set BULL_BOARD_USER + BULL_BOARD_PASS in
  // Render env vars. If either is missing, the UI is not registered.
  const bullBoardUser = process.env.BULL_BOARD_USER;
  const bullBoardPass = process.env.BULL_BOARD_PASS;
  const schedulerQueue = getSchedulerQueue();

  if (bullBoardUser && bullBoardPass && schedulerQueue) {
    const boardAdapter = new BullBoardFastifyAdapter();
    createBullBoard({
      queues: [new BullMQAdapter(schedulerQueue)],
      serverAdapter: boardAdapter,
    });
    boardAdapter.setBasePath("/admin/queues");

    await server.register(boardAdapter.registerPlugin(), {
      prefix: "/admin/queues",
      logLevel: "warn",
    });

    // Basic auth guard — runs before every /admin request
    server.addHook("onRequest", async (request, reply) => {
      if (!request.url.startsWith("/admin")) return;

      const authHeader = request.headers.authorization ?? "";
      if (!authHeader.startsWith("Basic ")) {
        reply.header("WWW-Authenticate", 'Basic realm="Bull Board"');
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const [user, pass] = Buffer.from(authHeader.slice(6), "base64")
        .toString()
        .split(":");

      if (user !== bullBoardUser || pass !== bullBoardPass) {
        reply.header("WWW-Authenticate", 'Basic realm="Bull Board"');
        return reply.code(401).send({ message: "Unauthorized" });
      }
    });

    server.log.info("[BullBoard] UI available at /admin/queues");
  }

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
  // /healthcheck e /livez são sempre isentos: as probes do k8s e o UptimeRobot
  // não podem tomar 503 do breaker — seria o breaker derrubando a própria
  // sinalização de saúde do pod.
  const PROBE_PATHS = new Set<string>([
    ROUTES.common.health,
    ROUTES.common.livez,
  ]);
  server.addHook("onRequest", async (request, reply) => {
    if (PROBE_PATHS.has(request.url)) return;

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
  // /healthcheck e /livez são pulados. O healthcheck porque sondar o banco
  // não deve influenciar o estado do circuito. O /livez porque responde 200
  // incondicionalmente: sem esta isenção, cada probe de liveness viraria um
  // recordSuccess() a cada 10s e, com successThreshold=2, manteria o breaker
  // fechado à força mesmo com o banco morto.
  server.addHook("onSend", async (request, _reply, payload) => {
    if (PROBE_PATHS.has(request.url)) return payload;

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
      "/v1/user/google",
      "/v1/user/refresh",
      "/v1/user/logout",
      "/v1/enter-queue", // QR code entry
      "/v1/commerce/nearby", // public nearby search
      "/v1/procurar-fila", // public queue search
      "/docs",
      "/healthcheck",
      "/livez",
      "/admin", // Bull Board — has its own Basic Auth guard
    ];
    // Routes that accept both authenticated users and anonymous (X-Anonymous-Id header).
    // Auth is optional: if a JWT is present it is verified; if absent, req.user stays
    // undefined and the controller falls back to the X-Anonymous-Id header.
    const isOptionalAuthPath = () =>
      request.url.startsWith("/v1/participants-queue/enter/") ||
      request.url.startsWith("/v1/notifications/") ||
      request.url.endsWith("/my-position") ||
      request.url.endsWith("/stream") ||
      request.url.endsWith("/exit") ||
      (request.method === "GET" &&
        /^\/v1\/commerce\/[^/]+$/.test(request.url.split("?")[0]));
    const isPublicPath = () =>
      PUBLIC_PATHS.some((path) => request.url.startsWith(path));

    if (!isPublicPath()) {
      if (isOptionalAuthPath()) {
        // Try to verify token but don't reject if missing — controller handles anonymous
        const authHeader = request.headers.authorization
          ?.replace("Bearer", "")
          .trim();
        if (authHeader) {
          verifyToken(request as ServerRequest, reply);
        }
      } else {
        verifyToken(request as ServerRequest, reply);
      }
    }
  });

  // ── Schema validation error logging ───────────────────────────────────────
  // Fastify returns 400 when a request fails JSON Schema validation. By default
  // the AJV error details are buried inside the error object and never logged.
  // This handler surfaces them so you can see exactly which field failed and
  // why (e.g. missing required field, wrong type, value out of range).
  // Note: when additionalProperties: false strips a field *silently* (no error
  // is thrown), the debug logs inside each controller will show you the body
  // after stripping so you can compare with what the client sent.
  server.setErrorHandler((error, request, reply) => {
    const err = error as { validation?: unknown[] } & Error;

    if (err.validation) {
      request.log.warn(
        {
          url: request.url,
          validation: err.validation,
          body: request.body,
          query: request.query,
        },
        "[Validation] schema validation failed"
      );
    }

    // Delegate to Fastify's default error handler for the actual response.
    reply.send(error);
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
