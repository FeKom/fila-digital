# ─────────────────────────────────────────────────────────────────────────────
# Fila Digital Backend — Multi-stage Dockerfile
#
# Stage 1 (builder): installs ALL dependencies and compiles TypeScript
# Stage 2 (runtime): copies only the compiled output + production deps
#                    Result is a minimal image (~200 MB vs ~600 MB full)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install only what's needed to compile
RUN apk add --no-cache python3 make g++

# Copy dependency manifests first — Docker cache layer:
# rebuilds npm install only when these files change, not on every code change
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install all dependencies (including devDependencies — needed for tsc)
RUN yarn install --frozen-lockfile

# Copy the rest of the source code
COPY tsconfig.json ./
COPY src ./src
COPY config ./config

# Compile TypeScript → dist/
RUN yarn build

# Prune devDependencies so we only copy production deps to the final image
RUN yarn workspaces focus --all --production 2>/dev/null || \
    yarn install --frozen-lockfile --production 2>/dev/null || true

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Install dumb-init: a minimal process supervisor that correctly forwards
# signals (SIGTERM, SIGINT) to Node.js. Without it, `docker stop` takes 10s.
RUN apk add --no-cache dumb-init wget

# Create a non-root user — never run Node.js as root in production
RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nodejs -G nodejs

WORKDIR /app

# Copy compiled output from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist    ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
# Config files are read at runtime by the `config` package
COPY --from=builder --chown=nodejs:nodejs /app/config  ./config

USER nodejs

# Document the port — does NOT publish it; that's done in docker-compose
EXPOSE 7070

# Healthcheck — Traefik and Docker will use this to decide if the container
# is ready to receive traffic. Matches the healthcheck in docker-compose.prod.yml
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:7070/healthcheck || exit 1

# dumb-init wraps node so signals are properly forwarded on `docker stop`
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
