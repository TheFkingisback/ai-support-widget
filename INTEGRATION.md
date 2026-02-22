# Integration TrackShare ↔ AI Support Widget — Documentação Completa

## Visão Geral da Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│  TRACKSHARE (Host App)                                               │
│                                                                      │
│  ┌─────────────┐    ┌────────────────┐    ┌─────────────────────┐   │
│  │ Browser      │    │ Next.js Proxy  │    │ Fastify Backend     │   │
│  │ (3004)       │───▶│ [...proxy]     │───▶│ (3006)              │   │
│  │              │    └────────────────┘    │                     │   │
│  │ SupportWidget│                          │ support.token.routes│   │
│  │ + Tracker    │                          │ support.context.svc │   │
│  └──────┬───────┘                          │ support.schema      │   │
│         │                                  │ request-logger      │   │
│         │ JWT + Context (push)             │ error-tracker       │   │
│         │                                  └─────────────────────┘   │
└─────────┼────────────────────────────────────────────────────────────┘
          │
          │  POST /api/cases { message, context }
          │  Authorization: Bearer <JWT>
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AI SUPPORT WIDGET SERVER (3005)                                     │
│                                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  Gateway    │─▶│  Snapshot     │─▶│  Context   │─▶│ Orchestrator │ │
│  │  (Cases,    │  │  Builder      │  │  Processor │  │ (OpenRouter) │ │
│  │   Messages) │  │  (SCS store)  │  │  (Sanitize)│  │              │ │
│  └────────────┘  └──────────────┘  └───────────┘  └──────┬───────┘ │
│                                                           │         │
│  ┌────────────┐  ┌──────────────┐                         │         │
│  │  Admin API  │  │  Cost Store   │◀────────────────────────         │
│  │  (Sessions) │  │  (LLM costs)  │                                 │
│  └────────────┘  └──────────────┘                                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Modelo: PUSH** — O TrackShare monta todo o contexto no momento do token e envia
junto com o primeiro request. O Widget server não puxa dados do TrackShare.

---

## 1. Fluxo Completo Passo a Passo

### Fase 1: Inicialização (quando o usuário abre o TrackShare)

**Arquivo:** `trackshare-web/src/components/support/SupportWidget.tsx`

1. O layout do dashboard monta `<SupportWidget/>` (componente invisível)
2. Se o usuário está logado (`getAccessToken()` retorna token), inicia `loadWidget()`
3. `initTracker()` começa a rastrear interações (cliques, navegações, erros)

### Fase 2: Token + Context (quando o componente monta)

**Chamada:** `GET /api/support/token` (via proxy Next.js → backend TrackShare :3006)

**Arquivo backend:** `Trackshare/src/modules/support/support.token.routes.ts`

O endpoint faz 3 coisas:

#### 2a. Busca dados do usuário no banco
```sql
SELECT id, email, role FROM auth_users WHERE id = <userId>
```

#### 2b. Gera JWT assinado para o Widget
```typescript
jwt.sign({
  tenantId: env.WIDGET_TENANT_ID,    // "ten_ac09be29d7a84720"
  userId:   `usr_${user.id}`,         // "usr_952b265a-7817-..."
  userEmail: user.email,
  userRoles: [user.role],
  plan:      'pro',
}, env.WIDGET_JWT_SECRET, { expiresIn: '8h' })
```

#### 2c. Monta o contexto (3 queries paralelas ao banco)
```typescript
const [userState, userHistory, userLogs] = await Promise.all([
  getUserState(user.id),         // Estado atual
  getUserHistory(user.id, 72),   // Últimas 72h de atividade
  getUserLogs(user.id, 72),      // Últimas 72h de logs
]);
```

**Resposta:**
```json
{
  "jwt": "<token-8h>",
  "context": {
    "userState": { ... },
    "userHistory": { ... },
    "userLogs": { ... }
  }
}
```

### Fase 3: Widget SDK carrega

**Arquivo:** `trackshare-web/public/widget.js` (build do SDK `widget/src/`)

```typescript
AISupportWidget.init({
  tenantKey: 'ten_ac09be29d7a84720',
  jwt:       '<token>',
  apiUrl:    'http://localhost:3005',
  theme:     'dark',
  context:   { userState, userHistory, userLogs },  // ← contexto pushed
  onTokenRefresh: async () => { ... },
  onOpen:    async () => { await flushNow(); },      // flush interactions
});
```

### Fase 4: Usuário abre o chat e envia mensagem

**Chamada do Widget SDK:** `POST http://localhost:3005/api/cases`

```json
{
  "message": "Meu upload falhou",
  "context": {
    "userState": { ... },
    "userHistory": { ... },
    "userLogs": { ... }
  }
}
```

**Header:** `Authorization: Bearer <jwt-assinado-pelo-trackshare>`

### Fase 5: Gateway recebe e cria o caso

**Arquivo:** `server/src/modules/gateway/gateway.routes.ts` (linha 40-75)

1. **Verifica JWT** → extrai `tenantId`, `userId` do token
2. **Rate limit** → máx 10 cases/minuto por user
3. **Cria case** → `gateway.createCase()` gera `cas_xxx`, `msg_xxx`
4. **Chama snapshot builder** → `snapshotService.buildSnapshot(tenantId, userId, caseId, reqId, data.context)`

### Fase 6: Snapshot Builder registra o contexto

**Arquivo:** `server/src/tests/mocks/mock-snapshot.ts` (usado atualmente)

O mock snapshot service recebe o `pushedContext` e monta o SCS:

```typescript
async buildSnapshot(tenantId, userId, caseId, requestId, pushedContext) {
  const ctx = pushedContext;
  const state   = ctx?.userState   ?? mockData;  // usa dados pushed se existem
  const history = ctx?.userHistory  ?? mockData;
  const logs    = ctx?.userLogs     ?? mockData;

  const snapshot: SupportContextSnapshot = {
    meta:           { snapshotId, createdAt, maxBytes: 5MB, truncation },
    identity:       { tenantId, userId, roles, plan, featuresEnabled },
    productState:   { entities, activeErrors, limitsReached },
    recentActivity: { windowHours: 72, events, clickTimeline },
    backend:        { recentRequests, jobs, errors },
    knowledgePack:  { docs: [], runbooks: [], changelog: [] },
    privacy:        { redactionVersion: '1.0', fieldsRemoved: [] },
  };

  _snapshots.push({ id: snapshotId, tenantId, caseId, data: snapshot });
}
```

### Fase 7: Usuário envia mensagens → Orchestrator

**Chamada:** `POST /api/cases/:caseId/messages`

**Arquivo:** `server/src/modules/orchestrator/orchestrator.service.ts`

1. Carrega case + mensagens anteriores
2. Salva mensagem do user
3. Busca snapshot do case
4. **Sanitiza o contexto** (context.service)
5. Monta system prompt com dados sanitizados
6. Chama OpenRouter LLM
7. Registra custo
8. Salva resposta do AI como mensagem
9. Retorna ao widget

### Fase 8: Sanitização antes do LLM

**Arquivo:** `server/src/modules/context/sanitizer.ts`

Pipeline obrigatório:
1. `redactSecrets()` → Remove JWTs, API keys, connection strings
2. `maskPII()` → Mascarar emails (`e***@d***.com`), telefones, CPFs
3. `removeBinary()` → Remove base64 >100 chars
4. `stripInternalUrls()` → Remove IPs internos, `.local`, `.corp`
5. `validateSchema()` → Verifica estrutura do SCS

### Fase 9: System Prompt enviado ao LLM

**Arquivo:** `server/src/modules/orchestrator/system-prompt.ts`

O prompt inclui seções:
- **USER STATE**: userId, roles, plan, features
- **ACTIVE ERRORS**: código, classe, recurso, timestamp
- **RECENT ACTIVITY**: click timeline (página, ação, hora)
- **BACKEND LOGS**: requests (rota, status, timing), jobs, errors
- **KNOWN ISSUES AND DOCS**: knowledge pack docs
- **LIMITS**: limites atingidos (current/max)

### Fase 10: LLM Call

**Arquivo:** `server/src/modules/orchestrator/openrouter.ts`

```
POST https://openrouter.ai/api/v1/chat/completions
{
  model: "anthropic/claude-sonnet-4",
  messages: [
    { role: "system", content: "<system prompt com contexto>" },
    { role: "user", content: "mensagem 1" },
    { role: "assistant", content: "resposta 1" },
    { role: "user", content: "mensagem atual" }
  ],
  max_tokens: 2048,
  temperature: 0.3
}
```

---

## 2. Origem dos Dados — O Que Cada Campo Contém

### `userState` — Estado Atual do Usuário

| Campo | Tabela origem | Query | Janela |
|-------|---------------|-------|--------|
| `userId` | `auth_users.id` | WHERE id = userId | Atual |
| `roles` | `auth_users.role` | WHERE id = userId | Atual |
| `profile.email` | `auth_users.email` | WHERE id = userId | Atual |
| `profile.fullName` | `auth_users.fullName` | WHERE id = userId | Atual |
| `profile.createdAt` | `auth_users.createdAt` | WHERE id = userId | Atual |
| `entities[type=car]` | `cars_user_cars` JOIN `cars_models` JOIN `cars_manufacturers` | WHERE userId = userId | Todos |
| `entities[type=session]` | `sessions_sessions` | ORDER BY createdAt DESC LIMIT 10 | 10 mais recentes |
| `activeErrors` | `support_errors` | WHERE userId AND createdAt > 72h | 72h, max 20 |
| `featuresEnabled` | Hardcoded | `['upload', 'download', 'matching', 'leaderboard']` | — |
| `plan` | Hardcoded | `'pro'` | — |
| `limitsReached` | Hardcoded | `[]` (vazio por enquanto) | — |

### `userHistory` — Atividade Recente

| Campo | Tabela origem | Query | Janela |
|-------|---------------|-------|--------|
| `events` | `support_activity_events` | WHERE userId AND createdAt > since LIMIT 200 | 72h |
| `clickTimeline` | `support_click_timeline` | WHERE userId AND createdAt > since LIMIT 200 | 72h |

### `userLogs` — Logs Técnicos

| Campo | Tabela origem | Query | Janela |
|-------|---------------|-------|--------|
| `recentRequests` | `support_request_logs` | WHERE userId AND createdAt > since LIMIT 100 | 72h |
| `jobs` | `uploads_files` JOIN `uploads_batches` | WHERE userId AND createdAt > since LIMIT 50 | 72h |
| `errors` | `support_errors` | WHERE userId AND createdAt > since LIMIT 50 | 72h |

---

## 3. Como e Quando os Dados São Criados

### 3.1 `support_request_logs` — Log de toda request HTTP

**Arquivo:** `Trackshare/src/modules/support/support.request-logger.ts`

- **Quando**: Hook `onResponse` do Fastify — dispara APÓS cada resposta HTTP
- **Como**: Fire-and-forget INSERT (não bloqueia a resposta)
- **Exclui**: `/health`, `/api/support/interactions`
- **Redige body**: rotas de auth (login/register)
- **Campos**: method, route, requestBody, responseStatus, timingMs, requestId

### 3.2 `support_errors` — Erros estruturados

**Arquivo:** `Trackshare/src/modules/support/support.error-tracker.ts`

- **Quando**: Hook de error handler global — dispara quando qualquer rota retorna erro
- **Como**: Fire-and-forget INSERT
- **Classifica**: 400→validation, 401/403→permission, 404→not_found, 409→conflict, 429→rate_limit, outros→server
- **Campos**: errorCode, errorClass, route, stackTrace (2000 chars), requestId

### 3.3 `support_activity_events` — Eventos de negócio

- **Quando**: Inseridos manualmente pelos services (upload, parse, match, etc.)
- **Como**: `INSERT INTO support_activity_events` pelos módulos de negócio
- **Campos**: event, resourceType (car/session/download), resourceId, metadata (JSON)

### 3.4 `support_click_timeline` — Interações do frontend

**Arquivo:** `trackshare-web/src/lib/support-tracker.ts`

- **Quando**: A cada 30 segundos (flush periódico) OU quando o widget abre (`onOpen: flushNow()`)
- **Como**: `POST /api/support/interactions` com array de eventos bufferizados
- **Captura**: Cliques em elementos com `[data-track]`, navegações entre páginas, erros JS
- **Buffer**: Máx 500 eventos em memória
- **Campos**: page, action (valor do data-track), elementId, textContent (truncado 200 chars)

---

## 4. Formato do SupportContextSnapshot (SCS)

```typescript
{
  meta: {
    snapshotId: "scs_4c8a0498c4a84aa3",
    createdAt: "2026-02-22T00:16:51.411Z",
    maxBytes: 5000000,
    truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 }
  },
  identity: {
    tenantId: "ten_ac09be29d7a84720",
    userId: "usr_952b265a-7817-4fd0-b99d-323c5e0cd335",
    roles: ["user"],
    plan: "pro",
    featuresEnabled: ["upload", "download", "matching", "leaderboard"]
  },
  productState: {
    entities: [
      { type: "car", id: "car_5", status: "active",
        metadata: { manufacturer: "BMW", model: "M3 Competition", category: "GT3" } },
      { type: "session", id: "abc-123", status: "ready",
        metadata: { circuitId: 42, bestLap: 92.5, totalLaps: 15, date: "2026-02-20" } }
    ],
    activeErrors: [
      { errorCode: "PARSE_FAILED", errorClass: "server",
        route: "/api/upload/batch/xyz/file", occurredAt: "2026-02-21T18:30:00Z",
        requestId: "req_a1b2c3d4" }
    ],
    limitsReached: []
  },
  recentActivity: {
    windowHours: 72,
    events: [
      { ts: "2026-02-22T00:10:00Z", event: "upload_started",
        resourceType: "session", resourceId: "batch_99", metadata: {} }
    ],
    clickTimeline: [
      { ts: "2026-02-22T00:12:00Z", page: "/dashboard", action: "click_upload_button" }
    ]
  },
  backend: {
    recentRequests: [
      { ts: "2026-02-22T00:15:00Z", method: "POST",
        route: "/api/upload/batch/xyz/file", httpStatus: 500,
        errorCode: "INTERNAL_ERROR", timingMs: 2340, requestId: "req_x1y2z3" }
    ],
    jobs: [
      { jobId: "file_abc", queue: "parse", status: "failed",
        errorCode: "PARSE_FAILED", filename: "session.vbo", createdAt: "2026-02-21" }
    ],
    errors: [
      { ts: "2026-02-22T00:15:00Z", errorCode: "INTERNAL_ERROR",
        errorClass: "server", route: "/api/upload/batch/xyz/file",
        requestId: "req_x1y2z3" }
    ]
  },
  knowledgePack: {
    docs: [],
    runbooks: [],
    changelog: []
  },
  privacy: {
    redactionVersion: "1.0",
    fieldsRemoved: []
  }
}
```

---

## 5. Armazenamento e Retenção

### No AI Widget Server (atualmente)

| Store | Tipo | Persistência | Retenção |
|-------|------|-------------|----------|
| Cases | In-memory array | **Volátil** — perde ao reiniciar | Enquanto o processo viver |
| Messages | In-memory array | **Volátil** | Enquanto o processo viver |
| Snapshots | In-memory array | **Volátil** | Enquanto o processo viver |
| LLM Costs | In-memory array | **Volátil** | Enquanto o processo viver |
| Tenants | In-memory array | **Volátil** | Enquanto o processo viver |
| Audit Log | In-memory array | **Volátil** | Enquanto o processo viver |

> **IMPORTANTE**: Atualmente TUDO está em memória (mock services). Reiniciar o
> servidor perde todos os dados. O serviço real usará PostgreSQL com as tabelas
> definidas em `gateway.schema.ts` e `snapshot.schema.ts`.

### No TrackShare Backend (PostgreSQL)

| Tabela | Retenção | Política |
|--------|----------|---------|
| `support_request_logs` | Indefinida | Sem purge automático |
| `support_errors` | Indefinida | Sem purge automático |
| `support_activity_events` | Indefinida | Sem purge automático |
| `support_click_timeline` | Indefinida | Sem purge automático |
| `auth_users` | Permanente | Dados do usuário |
| `cars_*` / `sessions_*` | Permanente | Dados de negócio |

> As queries de contexto usam janela de **72 horas** para filtrar dados. Dados
> mais antigos existem no banco mas não são enviados ao widget.

---

## 6. Segurança — O Que NÃO Vai pro LLM

### Redação de Secrets (antes de enviar ao OpenRouter)
- JWTs (`eyJ...`)
- API keys (`sk_`, `pk_`, `api_`, `key_`, `token_`, `secret_`, `password_`)
- Connection strings (`postgres://`, `mongodb://`, `redis://`)
- URLs pré-assinadas (com `X-Amz-Signature`, `Signature`, `token=`)
- Bearer tokens (>20 chars)
- Chaves PEM (`-----BEGIN PRIVATE KEY-----`)

### Mascaramento de PII
- Emails: `eduardo@example.com` → `e***@e***.com`
- Telefones: `+5511999887766` → `+55***766`
- SSN/CPF: parcialmente mascarado
- Cartões: `****-****-****-1234`

### Remoção
- Base64 >100 chars → `[BINARY_REMOVED]`
- IPs internos (10.x, 172.16-31.x, 192.168.x) → removidos
- Hostnames `.internal`, `.local`, `.corp` → removidos

### Isolamento de Tenant
- Todo JWT contém `tenantId`
- Toda query no Widget server inclui `WHERE tenantId = ?`
- Snapshot verifica `tenantId` no acesso

---

## 7. Custos LLM — Tracking

**Arquivo:** `server/src/modules/admin/cost.service.ts`

Cada chamada ao LLM registra:
```typescript
{
  id: "cost_1708560000_abc123",
  tenantId: "ten_ac09be29d7a84720",
  model: "anthropic/claude-sonnet-4",
  tokensIn: 1500,
  tokensOut: 350,
  estimatedCost: 0.01325,   // (1500/1000)*0.003 + (350/1000)*0.015
  caseId: "cas_0d9f148429a04076",
  createdAt: "2026-02-22T00:17:05Z"
}
```

**Modelos e preços:**
| Modelo | Input/1K tokens | Output/1K tokens |
|--------|----------------|-----------------|
| `anthropic/claude-sonnet-4` (fast) | $0.003 | $0.015 |
| `anthropic/claude-sonnet-4.5` (strong) | $0.005 | $0.025 |

---

## 8. Admin Sessions — Visualização

**URL:** `http://localhost:3003/admin/sessions`

**Endpoint:** `GET /api/admin/sessions` (Bearer admin-dev-key)

Mostra para cada sessão:
- **Case ID** + status (active/resolved/escalated)
- **User ID** do TrackShare
- **Quantidade de mensagens** trocadas
- **Snapshot received?** → indica se o contexto do TrackShare chegou
- **LLM calls** → quantas vezes chamou OpenRouter
- **Cost** → custo estimado total

**Detalhe** (`/admin/sessions/:caseId`): 3 abas
1. **Conversation** → todas as mensagens (user + assistant)
2. **Context Received** → SCS completo que veio do TrackShare
3. **LLM Calls** → cada chamada com modelo, tokens, custo

---

## 9. Mapa de Arquivos

### TrackShare Web (frontend)
| Arquivo | Função |
|---------|--------|
| `src/components/support/SupportWidget.tsx` | Monta widget + tracker |
| `src/lib/support-tracker.ts` | Rastreia cliques/navegações/erros |
| `src/app/api/[...proxy]/route.ts` | Proxy Next.js → backend |

### TrackShare Backend
| Arquivo | Função |
|---------|--------|
| `src/modules/support/support.token.routes.ts` | `GET /token` → JWT + context |
| `src/modules/support/support.context.service.ts` | `getUserState/History/Logs` |
| `src/modules/support/support.schema.ts` | Tabelas de suporte |
| `src/modules/support/support.request-logger.ts` | Log de requests HTTP |
| `src/modules/support/support.error-tracker.ts` | Tracking de erros |

### AI Widget Server
| Arquivo | Função |
|---------|--------|
| `server/src/modules/gateway/gateway.routes.ts` | `POST /api/cases`, `POST /messages` |
| `server/src/modules/gateway/gateway.service.ts` | CRUD de cases/messages |
| `server/src/modules/snapshot/snapshot.service.ts` | Build + store SCS |
| `server/src/modules/context/sanitizer.ts` | Pipeline de sanitização |
| `server/src/modules/context/ranker.ts` | Ranking por relevância |
| `server/src/modules/context/trimmer.ts` | Trim para caber no context window |
| `server/src/modules/orchestrator/orchestrator.service.ts` | Orquestração LLM |
| `server/src/modules/orchestrator/openrouter.ts` | HTTP call ao OpenRouter |
| `server/src/modules/orchestrator/system-prompt.ts` | Monta prompt com contexto |
| `server/src/modules/admin/session-admin.routes.ts` | API de sessions admin |
| `server/src/modules/admin/cost.service.ts` | Registro de custos LLM |

### Widget SDK
| Arquivo | Função |
|---------|--------|
| `widget/src/api.ts` | `createCase()`, `sendMessage()` |
| `widget/src/widget.ts` | Shadow DOM, FAB, chat UI |
| `widget/src/chat.ts` | Interface do chat |

---

## 10. Configuração (Env Vars)

### TrackShare Backend (.env)
```
WIDGET_JWT_SECRET=<min 16 chars>      # Segredo para assinar JWT do widget
WIDGET_TENANT_ID=ten_ac09be29d7a84720 # ID do tenant no Widget server
WIDGET_SERVICE_TOKEN=<string>          # Token service-to-service (pull model)
```

### TrackShare Web (.env.local)
```
BACKEND_URL=http://localhost:3006                  # Backend TrackShare
NEXT_PUBLIC_WIDGET_API_URL=http://localhost:3005    # Widget server
NEXT_PUBLIC_WIDGET_TENANT_ID=ten_ac09be29d7a84720  # Tenant ID
```

### AI Widget Server (.env)
```
PORT=3005
JWT_SECRET=<deve ser igual ao WIDGET_JWT_SECRET>   # Verifica tokens do TrackShare
OPENROUTER_API_KEY=<key>                            # API key do OpenRouter
LOG_LEVEL=medium
```

### Admin Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3005           # Widget server
NEXT_PUBLIC_ADMIN_API_KEY=admin-dev-key             # Key para admin API
```
