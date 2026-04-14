# Plano de Escalabilidade — Fila Digital Backend

## Contexto

O sistema Fila Digital é uma API REST (Fastify + Kysely + PostgreSQL) de gerenciamento de filas digitais para comércios brasileiros. Atualmente o projeto não possui compressão, índices otimizados, paginação, circuit breaker ou suporte multi-core. Para suportar milhares de usuários por segundo, precisamos adicionar múltiplas camadas de otimização **sem ferramentas externas** — apenas Node.js nativo e PostgreSQL.

---

## Fase 1 — Crítico

### 1.1 Índices no PostgreSQL

**Problema:** Queries em `participants_queue` fazem full table scan (sem índices em `queue_id`, `person_id`, `is_active`). Toda operação de fila é lenta.

**Arquivo:** `src/infra/database/migrations/06-add-performance-indexes.ts` (já criado)

**Índices:**

```sql
-- Participantes ativos por fila (usado em TODA request de fila)
CREATE INDEX idx_participants_queue_queue_active
  ON participants_queue(queue_id, is_active) WHERE is_active = true;

-- Verificar se usuário já está na fila
CREATE INDEX idx_participants_queue_person_queue_active
  ON participants_queue(person_id, queue_id, is_active) WHERE is_active = true;

-- Buscar fila por comércio
CREATE INDEX idx_queue_commerce_id ON queue(commerce_id);

-- Buscar comércio por owner
CREATE INDEX idx_commerce_owner_id ON commerce(owner_id);
```

**Impacto:** Queries de O(n) para O(log n). Maior ganho individual do plano.

---

### 1.2 Cache In-Memory com TTL (sem Redis)

**Problema:** Toda request faz queries repetidas ao banco (ex: `findQueueByCommerceId` é chamado em CADA endpoint de participants-queue, dados de commerce raramente mudam).

**Arquivo novo:** `src/utils/cache.ts`

**Implementação:** Classe `MemoryCache<T>` baseada em `Map` com:
- TTL por entrada (configurável, default 60s)
- Limite máximo de entradas (LRU eviction quando atinge o limite)
- Métodos: `get(key)`, `set(key, value, ttl?)`, `delete(key)`, `clear()`, `has(key)`
- Limpeza periódica automática de entradas expiradas (a cada 30s via `setInterval`)
- Tipagem genérica TypeScript

**Onde aplicar cache (nos repositórios):**

| Repository | Função | TTL | Motivo |
|---|---|---|---|
| `queue.repository.ts` | `findQueueByCommerceId` | 60s | Chamada em TODA request de fila |
| `commerce.repository.ts` | `findCommerceOwnerByUserId` | 120s | Verificação de permissão repetitiva |
| `commerce.repository.ts` | `getCommerceById` | 120s | Dados raramente mudam |
| `commerce.repository.ts` | `listAllCommerces` | 30s | Lista pesada, muda pouco |

**Invalidação:** Ao criar/atualizar/deletar queue ou commerce, limpar a chave correspondente do cache.

---

### 1.3 Rate Limiting Nativo

**Problema:** Sem proteção contra abuso. Um único cliente pode derrubar o servidor com requests ilimitadas.

**Arquivo novo:** `src/utils/rate-limiter.ts`

**Implementação:** Sliding window counter usando `Map<string, { count, windowStart }>`:
- Identificação por IP (`request.ip`)
- Limites diferenciados por tipo de rota:
  - Auth endpoints (`/user/login`, `/user/register`): 10 req/min (proteção contra brute force)
  - Write endpoints (POST, PUT, DELETE): 60 req/min
  - Read endpoints (GET): 200 req/min
- Headers de resposta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Response 429 quando excedido
- Limpeza periódica de entries expiradas

**Integração:** Hook `onRequest` em `server.ts` (antes do `preHandler` de auth).

---

## Fase 2 — Importante

### 2.1 Compressão de Respostas

**Problema:** Respostas JSON enviadas sem compressão, desperdiçando banda (especialmente listas de participantes).

**Arquivo:** `src/server.ts`

**Implementação:** Usar `@fastify/compress` (plugin oficial Fastify):

```typescript
import compress from '@fastify/compress';
server.register(compress, { global: true });
```

**Dependência a adicionar:** `@fastify/compress`

**Impacto:** Redução de 60-80% no tamanho das respostas JSON.

---

### 2.2 Paginação Cursor-Based

**Problema:** `findParticipantsByQueueId` e `listAllCommerces` retornam TODOS os registros. Com milhares de participantes, isso é insustentável.

**Arquivos:**
- `src/domain/participants-queue/repository/participants-queue.repository.ts`
- `src/domain/participants-queue/controller/participants-queue.controller.ts`
- `src/domain/commerce/repository/commerce.repository.ts`
- `src/domain/commerce/controller/commerce.controller.ts`

**Implementação:** Cursor-based usando `created_at` (UUID v7 já é ordenado por tempo):

```typescript
type PaginationParams = {
  cursor?: string;  // created_at do último item
  limit?: number;   // default 20, max 100
}

findParticipantsByQueueId(queue_id, { cursor, limit = 20 }) {
  let query = db.selectFrom("participants_queue")
    .selectAll()
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .orderBy("created_at", "asc")
    .limit(limit + 1); // +1 para saber se tem próxima página

  if (cursor) {
    query = query.where("created_at", ">", cursor);
  }
  // Retorna { data, nextCursor, hasMore }
}
```

**Endpoints afetados:**
- `GET /participants-queue/:commerce_id` — query params `?cursor=&limit=`
- `GET /commerce` — query params `?cursor=&limit=`

---

### 2.3 Validação com JSON Schema (Fastify nativo)

**Problema:** Validações manuais com regex nos controllers são lentas e verbosas. Fastify tem validação nativa via JSON Schema compilada em tempo de inicialização.

**Arquivos:** Todos os arquivos de rotas em `src/infra/routes/`

**Implementação:** Adicionar `schema` nas definições de rota:

```typescript
server.post('/user/register', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email', 'password', 'phone'],
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        phone: { type: 'string', minLength: 10 }
      }
    }
  }
}, handler);
```

Manter validações de negócio específicas (CNPJ, formato de telefone brasileiro) nos controllers, mas delegar validação estrutural ao Fastify.

---

### 2.4 Circuit Breaker para o Banco

**Problema:** Se o PostgreSQL ficar lento ou cair, todas as requests ficam travadas esperando timeout do pool. O servidor inteiro para.

**Arquivo novo:** `src/utils/circuit-breaker.ts`

**Implementação:** Padrão circuit breaker com 3 estados:
- **CLOSED** (normal): requests passam normalmente
- **OPEN** (falha): retorna erro 503 imediatamente, sem tentar o banco
- **HALF-OPEN** (teste): permite 1 request de teste para ver se o banco voltou

**Parâmetros:**
- `failureThreshold`: 5 falhas consecutivas abre o circuito
- `resetTimeout`: 30s tenta half-open
- `successThreshold`: 2 sucessos em half-open fecha o circuito

**Integração:** Wrapper ao redor do `db` exportado de `connect.ts`.

---

## Fase 3 — Nice-to-Have

### 3.1 Cluster Mode (Multi-core)

**Problema:** Node.js roda em single-thread. Em produção, apenas 1 core do CPU é utilizado.

**Arquivo novo:** `src/cluster.ts`

**Implementação:**

```typescript
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  const numWorkers = availableParallelism();
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on('exit', () => {
    cluster.fork(); // restart worker
  });
} else {
  initServer(); // cada worker roda o server
}
```

**Mudança no `src/index.ts`:** Importar `cluster.ts` ao invés de chamar `initServer()` diretamente.

---

### 3.2 Health Check Avançado

**Problema:** O healthcheck atual apenas retorna 200. Não indica se o banco está acessível, se há pressão de memória ou se o event loop está lento.

**Arquivo:** `src/infra/routes/health.ts`

**Implementação:**

```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  uptime: process.uptime(),
  memory: {
    heapUsed: process.memoryUsage().heapUsed,
    heapTotal: process.memoryUsage().heapTotal,
    rss: process.memoryUsage().rss
  },
  database: {
    connected: true | false,
    latency: "5ms" // SELECT 1
  },
  eventLoop: {
    lag: "2ms" // medido com perf_hooks
  }
}
```

---

### 3.3 Logging com Correlation ID

**Problema:** Em ambiente com milhares de requests simultâneas, é impossível rastrear uma request específica nos logs.

**Arquivo:** `src/server.ts`

**Implementação:** Configurar `genReqId` do Fastify para usar `uuidv7`:

```typescript
const server = fastify({
  genReqId: () => uuidv7(),
  // ...
});
```

O request ID é automaticamente incluso em todos os logs do Pino e retornado via header `X-Request-Id`.

---

### 3.4 Batch Operation — Chamar Próximos N Participantes

**Problema:** `removeFirst` só atende 1 pessoa por vez. Comércios com alto volume precisam chamar N de uma vez.

**Arquivos:**
- `src/domain/participants-queue/repository/participants-queue.repository.ts`
- `src/domain/participants-queue/controller/participants-queue.controller.ts`
- `src/infra/routes/participants-queue.ts`

**Novo endpoint:** `DELETE /participants-queue/:commerce_id/next/:count`

```typescript
export const softDeleteNextNParticipants = async (queue_id: string, count: number) => {
  const participants = await db
    .selectFrom("participants_queue")
    .select(["id", "person_id"])
    .where("queue_id", "=", queue_id)
    .where("is_active", "=", true)
    .orderBy("created_at", "asc")
    .limit(count)
    .execute();

  if (participants.length === 0) return [];

  const ids = participants.map(p => p.id);
  await db
    .updateTable("participants_queue")
    .set({ is_active: false })
    .where("id", "in", ids)
    .execute();

  return participants;
};
```

---

## Resumo de Arquivos

| Acao | Arquivo |
|---|---|
| Ja criado | `src/infra/database/migrations/06-add-performance-indexes.ts` |
| Criar | `src/utils/cache.ts` |
| Criar | `src/utils/rate-limiter.ts` |
| Criar | `src/utils/circuit-breaker.ts` |
| Criar | `src/cluster.ts` |
| Modificar | `src/server.ts` |
| Modificar | `src/domain/participants-queue/repository/participants-queue.repository.ts` |
| Modificar | `src/domain/participants-queue/controller/participants-queue.controller.ts` |
| Modificar | `src/domain/commerce/repository/commerce.repository.ts` |
| Modificar | `src/domain/commerce/controller/commerce.controller.ts` |
| Modificar | `src/infra/routes/participants-queue.ts` |
| Modificar | `src/infra/routes/commerce.ts` |
| Modificar | `src/infra/routes/user.ts` |
| Modificar | `src/domain/queue/repository/queue.repository.ts` |
| Modificar | `src/infra/routes/health.ts` |
| Modificar | `src/index.ts` |
| Modificar | `package.json` (adicionar `@fastify/compress`) |

## Verificacao

1. Rodar `yarn test:run` apos cada fase
2. Rodar `yarn migration:up` para aplicar os indices
3. Verificar header `Content-Encoding: gzip` nas respostas
4. Testar `GET /participants-queue/:id?limit=10&cursor=...` e verificar `nextCursor`
5. `GET /healthcheck` deve retornar metricas detalhadas
