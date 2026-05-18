# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fila Digital** is a digital queue management SaaS for Brazilian commerce. Businesses create queues; customers join via QR codes or the app. The monorepo has a Fastify backend and Next.js frontend deployed separately.

## Commands

All commands use **pnpm** and **Turbo** at the root, or `--filter` to target a specific app.

```bash
# Root (all apps via Turbo)
pnpm dev              # Dev mode for all apps
pnpm build            # Production build
pnpm lint             # ESLint all apps
pnpm test             # Vitest all apps
pnpm validate         # Lint + format check
pnpm format           # Prettier

# Target a specific app
pnpm dev --filter=@fila-digital/backend
pnpm dev --filter=@fila-digital/frontend
pnpm test --filter=@fila-digital/backend

# Backend-only scripts (run from apps/backend or use --filter)
pnpm run migration:up         # Run pending migrations
pnpm run migration:down       # Rollback last migration
pnpm run test:coverage
pnpm run stress:load          # k6 load test

# Frontend-only
pnpm run test:watch
pnpm run test:coverage
```

**Local dev ports:**
- Frontend: `http://localhost:3000` (Next.js + Turbopack)
- Backend: `http://localhost:7070` (Fastify)
- Grafana: `http://localhost:3100` (admin/admin)
- Jaeger: `http://localhost:16686`
- Prometheus: `http://localhost:9090`

**Local setup:**
```bash
pnpm install
cp .env.example .env
docker-compose up -d    # PostgreSQL, Redis, full observability stack
pnpm dev
```

## Architecture

### Monorepo Layout

```
apps/backend/    # Fastify 5 API → deployed on Render
apps/frontend/   # Next.js 15 SPA → deployed on Vercel
packages/types/  # Shared TypeScript types
observability/   # Grafana, Prometheus, Loki, Jaeger configs
postgres/        # PostgreSQL init scripts
```

### Backend (`apps/backend/src/`)

Follows domain-driven / clean architecture:

```
index.ts           # Entry: starts telemetry first, then migrations, server, schedulers
server.ts          # Fastify setup: CORS, rate-limit, auth hooks, error handler
constants.ts       # Centralized route path definitions

domain/
  user/            # controller/ → use-cases/ → repository/ (pattern repeated per domain)
  commerce/
  queue/
  participants-queue/

infra/
  database/
    connect.ts     # Kysely + pg Pool, slow-query logging
    types.ts       # Full DB schema as Kysely types (source of truth)
    migrations/    # 24 versioned SQL migrations (run automatically on startup)
    cache.ts       # Redis-backed cache with in-memory fallback
  routes/          # Registers all domain routes onto Fastify
  schemas/         # Fastify JSON Schema for request validation
  telemetry/       # OpenTelemetry tracer setup
  builder/         # Dependency injection (wires repositories → use-cases → controllers)
  config.ts        # Typed config (wraps convict/env vars)
  email.ts         # Resend transactional email

schedulers/        # node-cron jobs: auto-close, auto-open, cleanup queues
utils/
  errors.ts        # Centralized HTTP error response helpers
  circuit-breaker.ts  # DB circuit breaker (opens on failure, skips /healthcheck)
  token.ts         # JWT verification
  rateLimits.ts    # Named rate-limit configs
```

**Key patterns:**
- Every domain has controller → use-case → repository layers. Don't bypass layers.
- `infra/database/types.ts` is the single source of truth for DB schema. Kysely types flow from there.
- `index.ts` imports telemetry **before anything else** — required for OTEL to instrument modules correctly.
- Circuit breaker wraps all DB calls; returns 503 when open. Healthcheck endpoint bypasses it.

### Frontend (`apps/frontend/src/`)

```
app/
  (auth)/          # Login, register routes
  (commerce)/      # Commerce dashboard, management
  (queue)/         # Queue views, QR entry
  user/            # Profile
domains/           # Feature domains mirroring backend
  user/
    components/    # Header, GoogleProvider, etc.
    user.actions.ts  # Server Actions: auth checks, cookie reads
  commerce/
  queue/
lib/
  api.ts           # Fetch wrapper with auto token-refresh on 401
  anonymousId.ts   # Anonymous user UUID (localStorage)
  constants.ts
components/        # Shared UI primitives
```

**Frontend auth flow:**
1. Google OAuth or email/password → backend sets httpOnly cookies (access + refresh tokens)
2. Server Actions read cookies to determine auth state for SSR
3. `lib/api.ts` auto-refreshes on 401, retries the original request

### Database Schema (key tables)

| Table | Purpose |
|---|---|
| `person` | Users — role: `OWNER` \| `CUSTOMER` |
| `commerce` | Businesses — owned by a `person` |
| `queue` | Queues — type: `ephemera` \| `permanent`, status: `open` \| `closed` |
| `participants_queue` | Queue entries — tracks position, anonymous_id, leave_reason |
| `refresh_tokens` | Hashed JWT refresh tokens |
| `commerce_admins` | Admin grants (commerce owner grants another person) |
| `queue_schedules` | Auto-open/close rules — type: `once` \| `daily` |

### API Structure

All routes under `/v1`. Rate limits: global 60 req/min, auth 5 req/min, read 100, write 60. Rate limiting uses `CF-Connecting-IP` / `X-Forwarded-For` (behind Cloudflare proxy).

**Route groups:**
- `/v1/user` — register, login, google-oauth, refresh, logout, details, update, delete, claimAnonymous
- `/v1/commerce` — CRUD, admin grants, nearby search
- `/v1/queue` — CRUD, schedules, auto-close/open
- `/v1/participants-queue` — enter, exit, my-position, list
- `/v1/enter-queue` — public QR code entry (optional auth, falls back to `X-Anonymous-Id` header)

### Testing

- **Backend**: Vitest + Supertest + testcontainers (spins up real PostgreSQL — no mocks).
- **Frontend**: Vitest + React Testing Library.
- Separate `docker-compose-test.yml` for the test environment.

### Observability

Full stack in `docker-compose.yml`: PostgreSQL 16, Redis, Prometheus, Grafana, Loki, Jaeger, OTEL Collector. Backend emits structured Pino logs → Loki, traces → Jaeger, metrics → Prometheus. Sentry is optional (10% transaction sampling; no-ops when DSN absent).

## Important Constraints

- **Business rules**: Max 3 active commerces per user; max 1 active queue per commerce (enforced in use-cases).
- **Frontend language**: All UI text is in **pt-BR**. Do not translate to English.
- **Migrations**: Never edit existing migration files. Always add new numbered ones.
- **OTEL import order**: `infra/telemetry` must be imported before any other module in `index.ts`.
