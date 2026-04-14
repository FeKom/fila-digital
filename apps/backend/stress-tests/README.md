# Stress Tests

Testes de performance da API usando [k6](https://k6.io/).

## Pre-requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado
- Servidor rodando localmente (`yarn dev`) na porta `7070`
- PostgreSQL e Redis acessiveis

## Scripts disponiveis

| Script | Comando | VUs | Duracao | Objetivo |
|---|---|---|---|---|
| **Smoke** | `yarn stress:smoke` | 3 | 30s | Validar que a API esta viva e respondendo |
| **Smoke User** | `yarn stress:smokeUser` | 3 | 30s | Smoke test com registro + login de usuario |
| **Load** | `yarn stress:load` | 50 | 5min | Trafego sustentado para validar performance normal |
| **Stress** | `yarn stress:stress` | 400 | 10min | Encontrar o ponto de ruptura da API |

## Como rodar

```bash
# Iniciar o servidor
yarn dev

# Em outro terminal, rodar o teste desejado
yarn stress:smoke
yarn stress:smokeUser
yarn stress:load
yarn stress:stress
```

### Variaveis de ambiente

| Variavel | Default | Descricao |
|---|---|---|
| `BASE_URL` | `http://localhost:7070` | URL base da API |
| `TEST_EMAIL` | `test@test.com` | Email do usuario de teste |
| `TEST_PASSWORD` | `12345678` | Senha do usuario de teste |

```bash
# Exemplo: rodar contra outro ambiente
BASE_URL=http://staging:7070 k6 run stress-tests/load.js
```

## Seed automatico

Todos os scripts registram um usuario de teste automaticamente no `setup()` antes de iniciar as iteracoes. Se o usuario ja existir, o registro e ignorado. Nao e necessario seed manual.

## Rate Limiting

A API aplica rate limiting por IP:

| Categoria | Limite | Endpoints |
|---|---|---|
| **auth** | 10 req/min | `/user/login`, `/user/register` |
| **write** | 60 req/min | `POST`, `PUT`, `DELETE` |
| **read** | 200 req/min | `GET` |
| **open** | sem limite | `/healthcheck` |

Nos testes de **load** e **stress**, respostas `429 Too Many Requests` sao esperadas e aceitas como comportamento normal (configurado via `http.expectedStatuses`). Isso reflete o rate limiter funcionando corretamente, nao erros reais do servidor.

## Thresholds

| Metrica | Load | Stress |
|---|---|---|
| `http_req_duration p(95)` | < 500ms | < 1000ms |
| `http_req_failed` | < 1% | < 5% |

## Resultados

Ambiente: MacBook Air (Apple Silicon), PostgreSQL 17.5, Redis local, Node.js >= 22.17.

### Load Test (50 VUs, 5 min)

```
Requests totais:   47,194
Throughput:        ~157 req/s
Latencia media:    5.11ms
Latencia p(95):    12.08ms
Latencia maxima:   72.62ms
Taxa de falha:     0.00%
Checks aprovados:  100% (47,192 / 47,192)
```

| Threshold | Criterio | Resultado |
|---|---|---|
| `http_req_duration` | p(95) < 500ms | **12.08ms** |
| `http_req_failed` | rate < 1% | **0.00%** |

### Stress Test (400 VUs, 10 min)

```
Requests totais:   897,832
Throughput:        ~1,495 req/s
Latencia media:    14.93ms
Latencia mediana:  3.90ms
Latencia p(95):    70.99ms
Latencia maxima:   1.21s
Taxa de falha:     0.00%
Checks aprovados:  100% (897,830 / 897,830)
```

| Threshold | Criterio | Resultado |
|---|---|---|
| `http_req_duration` | p(95) < 1000ms | **70.99ms** |
| `http_req_failed` | rate < 5% | **0.00%** |

### Resumo

- A API sustenta **~1,500 req/s** com 400 usuarios virtuais simultaneos sem nenhum erro real
- Latencia mediana se mantem em **~4ms** mesmo sob stress pesado
- O rate limiter funciona corretamente, retornando `429` quando o limite por IP e excedido
- Nenhuma degradacao significativa de performance durante os 10 minutos de stress test
