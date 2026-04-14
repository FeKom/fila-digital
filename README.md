# Fila Digital

Digital queue management SaaS for Brazilian commerce. Businesses create queues, customers join via QR code or app.

## Monorepo Structure

```
fila-digital/
├── apps/
│   ├── backend/    # Fastify 5 API → Render
│   └── frontend/   # Next.js 15    → Vercel
├── packages/       # Shared packages (types, utils) — future
└── docs/           # LLM architecture docs (gitignored, local only)
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env

# Run all apps in dev mode
pnpm dev

# Run a single app
pnpm dev --filter=@fila-digital/backend
pnpm dev --filter=@fila-digital/frontend
```

## Apps

| App | Tech | Deploy | Port |
|---|---|---|---|
| `apps/backend` | Fastify 5, PostgreSQL, Redis | Render | 7070 |
| `apps/frontend` | Next.js 15, Tailwind, DaisyUI | Vercel | 3000 |

## Scripts

```bash
pnpm dev        # Start all apps
pnpm build      # Build all apps
pnpm lint       # Lint all apps
pnpm test       # Test all apps
pnpm validate   # Lint + format check all apps
```

## Deployment

- **Frontend** → Vercel. Set root directory to `apps/frontend` in project settings.
- **Backend** → Render. Uses `apps/backend/Dockerfile`. Set root directory to `apps/backend`.

## Environment Variables

See `.env.example` at the root for all required variables.
