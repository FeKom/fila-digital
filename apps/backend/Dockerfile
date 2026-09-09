# ─────────────────────────────────────────────────────────────────────────────
# Fila Digital Backend — imagem multi-stage
#
# Build:   bun (install + tsup)   — install rápido, workspace-aware
# Runtime: bun
#
# Nota sobre OTEL: o bun aceita module.register() mas nunca dispara o hook, então
# import-in-the-middle (o caminho de patch para módulos ESM puros) não funciona.
# Isso NÃO afeta este projeto: pg, ioredis e http são pacotes CommonJS, e mesmo
# importados via `import` são carregados pelo loader CJS, onde o patch acontece
# via require-in-the-middle — que funciona no bun. Verificado: os quatro alvos
# (pg.query, ioredis.sendCommand, http.request, http.Server.emit) ficam
# instrumentados de forma idêntica em node e bun.
#
# Se um dia uma dependência instrumentada for ESM pura, ela deixa de ser
# rastreada silenciosamente no bun — reavaliar o runtime nesse caso.
#
# ATENÇÃO — CPU: no x86_64 o bun exige AVX e faz segfault sem ele ("CPU lacks
# AVX support"), onde o node rodaria normalmente. O nó atual é um AMD EPYC 9J14
# (avx, avx2, avx512f), então está coberto — mas isso restringe a escolha de
# shape numa migração futura. Para CPU antiga existe a variante oven/bun:*-baseline.
#
# O contexto de build é a RAIZ do monorepo, não apps/backend. Buildar com:
#   docker build -f apps/backend/Dockerfile -t fila-digital-backend .
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Só os manifests + lockfile. Camada cacheada: só reinstala quando as
# dependências mudam, não a cada alteração de código.
FROM oven/bun:1.4-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
# O bun.lock cobre o workspace inteiro — com --frozen-lockfile todos os
# package.json referenciados precisam existir, inclusive o do frontend.
COPY apps/backend/package.json   apps/backend/
COPY apps/frontend/package.json  apps/frontend/
COPY packages/types/package.json packages/types/

RUN bun install --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/types/src        packages/types/src
COPY apps/backend/tsconfig.json apps/backend/tsup.config.ts apps/backend/
COPY apps/backend/src          apps/backend/src

# tsup mantém as dependências externas de propósito. Bundlar tudo quebraria o
# OTEL, que precisa interceptar os módulos no momento do carregamento.
RUN cd apps/backend && bun run build

# ── Stage 3: prod-deps ───────────────────────────────────────────────────────
# Só as dependências de produção do backend. O --filter é o que torna isso
# possível no monorepo: derruba next/react e todo o grafo do frontend.
# --linker=hoisted gera um node_modules plano — o node resolve nativamente,
# sem depender de symlinks relativos sobreviverem ao COPY entre stages.
FROM oven/bun:1.4-alpine AS prod-deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backend/package.json   apps/backend/
COPY apps/frontend/package.json  apps/frontend/
COPY packages/types/package.json packages/types/

RUN bun install --frozen-lockfile --production \
      --filter='@fila-digital/backend' \
      --linker=hoisted

# ── Stage 4: runtime ─────────────────────────────────────────────────────────
FROM oven/bun:1.4-alpine AS runtime

# dumb-init encaminha SIGTERM/SIGINT corretamente ao processo. Sem ele o
# `docker stop` espera os 10s de timeout, e no k8s cada rolling update
# paga esse atraso por pod.
RUN apk add --no-cache dumb-init wget

RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nodejs -G nodejs

WORKDIR /app

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules            ./node_modules
COPY --from=builder   --chown=nodejs:nodejs /app/apps/backend/dist       ./dist
COPY --from=builder   --chown=nodejs:nodejs /app/apps/backend/package.json ./package.json
# Lido em runtime pelo pacote `config`, resolvido a partir do cwd (/app).
COPY --chown=nodejs:nodejs apps/backend/config ./config

USER nodejs

ENV NODE_ENV=production
EXPOSE 7070

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:7070/healthcheck || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "dist/index.js"]
