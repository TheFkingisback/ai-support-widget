# AI Support Widget — Guia Definitivo para Desenvolvedores

> Leia tudo. Cada secao. Cada detalhe. Antes de tocar em qualquer codigo.

---

## Indice

1. [O Que Este Projeto Faz](#1-o-que-este-projeto-faz)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Como Rodar o Projeto](#3-como-rodar-o-projeto)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Backend (server/)](#5-backend-server)
6. [Widget SDK (widget/)](#6-widget-sdk-widget)
7. [Admin Dashboard (web/)](#7-admin-dashboard-web)
8. [Tipos Compartilhados (shared/)](#8-tipos-compartilhados-shared)
9. [Sistema de Autenticacao](#9-sistema-de-autenticacao)
10. [Fluxo Completo de uma Conversa](#10-fluxo-completo-de-uma-conversa)
11. [Como Cadastrar um Novo Tenant](#11-como-cadastrar-um-novo-tenant)
12. [Como Integrar o Widget no App do Cliente](#12-como-integrar-o-widget-no-app-do-cliente)
13. [Seguranca e Sanitizacao](#13-seguranca-e-sanitizacao)
14. [Sistema de Logs](#14-sistema-de-logs)
15. [Testes](#15-testes)
16. [Resolucao de Problemas](#16-resolucao-de-problemas)
17. [Glossario](#17-glossario)

---

## 1. O Que Este Projeto Faz

O AI Support Widget e um chatbot de suporte inteligente embutivel em qualquer aplicacao web. Diferente de chatbots genericos, ele:

1. **Coleta dados reais** do estado do usuario (erros ativos, logs recentes, acoes, limites atingidos)
2. **Monta um Snapshot (SCS)** — uma fotografia completa do momento do problema
3. **Sanitiza o snapshot** — remove segredos, mascara PII, tira URLs internas
4. **Envia tudo para uma IA** via OpenRouter (Llama, Claude, GPT, etc.)
5. **A IA responde com diagnostico baseado em evidencias** — nao adivinhacao
6. **Sugere acoes concretas** — retry, abrir docs, criar ticket, pedir acesso
7. **Se nao resolver, escala para humano** criando ticket no Zendesk/Jira

E **multi-tenant**: cada empresa-cliente recebe um `tenantId` unico (ex: `ten_a1b2c3`). Os dados de um tenant NUNCA vazam para outro.

---

## 2. Arquitetura Geral

```
[App do Cliente]                    [Admin Dashboard]
      |                                    |
      v                                    v
[Widget SDK]  -- REST -->  [Backend Fastify :3002]  <-- REST -- [Admin UI :3003]
 (botao JS)                        |
                         +---------+---------+----------+
                         |         |         |          |
                   [Gateway]  [Snapshot]  [Context]  [Orchestrator]
                         |         |         |          |
                   [Cases DB] [Client APIs] [Sanitizer] [OpenRouter LLM]
                         |                              |
                   [Escalation]                    [Cost Tracker]
                         |
                   [Zendesk/Jira]
```

### Tres Partes Independentes

| Parte | Tecnologia | Porta | O que faz |
|-------|-----------|-------|-----------|
| **server/** | Fastify 5, Node.js 20, TypeScript | 3002 | API principal: gateway (widget) + admin |
| **web/** | Next.js 14, React, Tailwind | 3003 | Painel admin: gerenciar tenants, ver analytics |
| **widget/** | TypeScript puro, zero deps | N/A | SDK que o cliente embute no HTML dele |

### Infraestrutura

| Servico | Tecnologia | Porta | Container Docker |
|---------|-----------|-------|------------------|
| Banco de dados | PostgreSQL 16 + pgvector | 5434 | aiwidget-postgres |
| Fila de jobs | Redis 7 | 6381 | aiwidget-redis |

---

## 3. Como Rodar o Projeto

### Pre-requisitos

- **Node.js 20+** instalado
- **Docker Desktop** rodando (para PostgreSQL e Redis)
- **Chave do OpenRouter** (https://openrouter.ai — crie uma conta e gere uma API key)

### Passo a Passo

```bash
# 1. Clone o repositorio
git clone <url> && cd ai-support-widget

# 2. Instale dependencias (3 modulos separados)
cd server && npm install && cd ..
cd web && npm install && cd ..
cd widget && npm install && cd ..

# 3. Suba o banco e o Redis
docker-compose up -d

# 4. Verifique se os containers estao rodando
docker ps
# Esperado: aiwidget-postgres (5434) e aiwidget-redis (6381)

# 5. Configure o .env (na raiz do projeto)
# Veja secao abaixo

# 6. Inicie o backend
cd server
node --env-file=../.env --import tsx/esm src/index.ts
# Saida: "[INFO] Server running on http://localhost:3002"

# 7. Em OUTRO terminal, inicie o admin dashboard
cd web
npm run dev -- --port 3003
# Acesse: http://localhost:3003/admin
```

### Arquivo .env (raiz do projeto)

```bash
DATABASE_URL=postgres://aiwidget:devpassword@localhost:5434/aiwidget_dev
REDIS_URL=redis://localhost:6381
JWT_SECRET=uma-chave-secreta-com-pelo-menos-32-caracteres-aqui
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui
LOG_LEVEL=medium
PORT=3002
CORS_ORIGINS=http://localhost:3003,http://localhost:3002
```

### Arquivo web/.env.local

```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Verificacao Rapida

```bash
# Backend saudavel?
curl http://localhost:3002/api/health
# Resposta: {"ok":true,"version":"..."}

# Admin API funcionando?
curl -H "Authorization: Bearer admin-dev-key" http://localhost:3002/api/admin/tenants
# Resposta: {"tenants":[...]}
```

---

## 4. Estrutura de Pastas

```
ai-support-widget/
├── .env                          # Variaveis de ambiente (NAO versionar)
├── CLAUDE.md                     # Regras para IA (leia!)
├── API-CONTRACT.md               # Contrato de API (a lei)
├── docker-compose.yml            # PostgreSQL + Redis
├── shared/
│   └── types.ts                  # Tipos TypeScript compartilhados
├── server/
│   └── src/
│       ├── index.ts              # Ponto de entrada, wiring de servicos
│       ├── app.ts                # Construcao do Fastify (middleware, rotas)
│       ├── modules/
│       │   ├── gateway/          # Gerenciamento de Cases + Mensagens
│       │   ├── snapshot/         # Construcao do SCS (chama APIs do cliente)
│       │   ├── context/          # Sanitizacao, ranking, trimming
│       │   ├── orchestrator/     # Orquestracao IA (OpenRouter)
│       │   ├── knowledge/        # RAG: base de conhecimento
│       │   ├── escalation/       # Criacao de tickets (Zendesk/Jira)
│       │   └── admin/            # Tenant CRUD, analytics, audit, custos
│       └── shared/
│           ├── logger.ts         # Logger com 5 niveis + requestId
│           ├── errors.ts         # Classes de erro tipadas
│           ├── auth.ts           # Middleware JWT + Admin auth
│           ├── env.ts            # Validacao de env vars com Zod
│           └── types.ts          # Tipos do servidor (sync com shared/)
├── web/
│   └── src/
│       ├── app/
│       │   ├── admin/            # Dashboard admin
│       │   │   ├── tenants/      # CRUD de tenants
│       │   │   ├── analytics/    # Graficos e metricas
│       │   │   └── audit/        # Log de auditoria
│       │   ├── demo/             # Pagina demo do widget
│       │   └── developers/       # Portal do desenvolvedor / docs da API
│       ├── components/           # Componentes React reutilizaveis
│       └── lib/
│           ├── api.ts            # Cliente HTTP para admin API
│           ├── types.ts          # Tipos do frontend (sync com shared/)
│           └── test-helpers.ts   # Fabricas de mocks para testes
└── widget/
    └── src/
        ├── widget.ts             # Classe principal, Shadow DOM, FAB
        ├── chat.ts               # Painel de chat, envio de mensagens
        ├── api.ts                # Cliente HTTP para gateway
        ├── styles.ts             # CSS-in-JS (injetado no Shadow DOM)
        ├── actions.ts            # Botoes de acao + dialogo de confirmacao
        ├── evidence.ts           # Badges de evidencia
        ├── chat-renderer.ts      # Renderizacao de mensagens
        └── types.ts              # Tipos do widget
```

---

## 5. Backend (server/)

### 5.1 Ponto de Entrada: index.ts

O `index.ts` e o "main" do servidor. Ele:

1. Le as variaveis de ambiente com `getEnv()` (validadas via Zod)
2. Cria todos os servicos com **stores em memoria** (sem banco real no dev)
3. Passa tudo para `buildApp()` que monta o Fastify
4. Escuta na porta configurada

**Padrao de DI (Dependency Injection)**: Cada servico e uma funcao factory que recebe suas dependencias:
```typescript
// Exemplo simplificado
const gateway = createGatewayService(db);
const orchestrator = createOrchestratorService({ gateway, snapshotSvc, ... });
const app = await buildApp({ gatewayService: gateway, orchestratorService: orchestrator });
```

### 5.2 App Builder: app.ts

A funcao `buildApp(opts)` recebe a interface `AppDeps`:

```typescript
interface AppDeps {
  jwtSecret?: string
  gatewayService?: GatewayService
  rateLimiter?: RateLimiter
  snapshotService?: SnapshotService
  orchestratorService?: OrchestratorService
  escalationService?: EscalationService
  adminRouteOpts?: AdminRouteOpts
}
```

Tudo e **opcional**. Se um servico nao for passado, as rotas dele nao sao registradas. Isso permite testes isolados de modulos.

**Middleware global** (aplicado a TODAS as rotas):
- **Helmet** — Headers de seguranca (CSP, X-Frame-Options, etc.)
- **CORS** — Origens configuradas via `CORS_ORIGINS`
- **Request logging** — Toda request logada com timing
- **Error handler** — Converte `AppError` em JSON padronizado

**requestId**: Cada request recebe um ID unico (`req_abc123def456`). Esse ID e propagado para TODOS os logs, para rastrear uma request do inicio ao fim.

### 5.3 Modulos do Backend

#### Gateway (gateway/)

**O que faz**: Gerencia Cases (conversas) e Messages.

**Interface principal**:
```typescript
interface GatewayService {
  createCase(tenantId, userId, firstMessage, requestId?) → { case, message }
  addMessage(caseId, tenantId, role, content, opts?, requestId?) → Message
  getCase(caseId, tenantId, requestId?) → { case, messages[] }
  addFeedback(caseId, tenantId, feedback, requestId?) → void
  escalateCase(caseId, tenantId, reason, requestId?) → void
  logAudit(tenantId, userId, caseId, action, details, requestId?) → void
}
```

**Rotas expostas** (todas precisam de JWT):

| Metodo | Rota | Rate Limit | Funcao |
|--------|------|-----------|--------|
| POST | `/api/cases` | 10/60s | Cria case + 1a mensagem |
| GET | `/api/cases/:caseId` | — | Busca case + mensagens |
| POST | `/api/cases/:caseId/messages` | 30/60s | Envia mensagem (dispara IA) |
| POST | `/api/cases/:caseId/feedback` | — | Feedback positivo/negativo |
| POST | `/api/cases/:caseId/escalate` | — | Escala para humano |
| POST | `/api/cases/:caseId/actions` | — | Executa acao sugerida |
| GET | `/api/health` | — | Health check |

**Regra critica**: Toda query ao banco inclui `tenantId` no WHERE. Sem excecao.

---

#### Snapshot (snapshot/)

**O que faz**: Constroi o Support Context Snapshot (SCS) — a fotografia completa do estado do usuario.

**Como funciona**:
1. Chama **4 endpoints do app do cliente** em paralelo (`Promise.allSettled`):
   - `GET {baseUrl}/support/user-state?userId=X` → estado atual
   - `GET {baseUrl}/support/user-history?userId=X&windowHours=72` → acoes recentes
   - `GET {baseUrl}/support/user-logs?userId=X&windowHours=72` → logs de backend
   - `GET {baseUrl}/support/business-rules` → regras + catalogo de erros
2. Se um endpoint falha, os outros continuam (graceful degradation)
3. Monta o objeto SCS com o que conseguiu
4. Armazena no banco

**O SCS contem**:
- **identity**: quem e o usuario (roles, plano, features)
- **productState**: entidades ativas, erros ativos, limites atingidos
- **recentActivity**: eventos dos ultimos 72h, timeline de cliques
- **backend**: requests recentes, jobs, erros do servidor
- **knowledgePack**: docs, runbooks, changelog
- **privacy**: o que foi removido pela sanitizacao

---

#### Context (context/)

**O que faz**: Sanitiza, ranqueia e corta o SCS antes de enviar para a IA.

**Pipeline em 3 etapas**:

**Etapa 1 — Sanitizacao** (sanitizer.ts):
| Passo | O que faz | Exemplo |
|-------|-----------|---------|
| `redactSecrets()` | Remove API keys, tokens, senhas | `sk_live_123` → `[REDACTED]` |
| `maskPII()` | Mascara emails, telefones | `user@mail.com` → `u***@m***.com` |
| `removeBinary()` | Remove payloads base64 grandes | (blob removido) |
| `stripInternalUrls()` | Remove IPs e hostnames internos | `10.0.0.5:3000` → removido |
| `validateSchema()` | Verifica estrutura do SCS | Excecao se invalido |

**Etapa 2 — Ranking** (ranker.ts):
| Prioridade | Conteudo | Comportamento |
|-----------|----------|---------------|
| 1 (nunca corta) | identity, productState | Sempre incluido |
| 2 | recentActivity, backend | Ordenado por recencia |
| 3 | knowledgePack | Ordenado por recencia |

**Etapa 3 — Trimming** (trimmer.ts):
- Mede o tamanho em bytes do SCS
- Se excede `maxContextBytes` (padrao 5MB), remove items da prioridade mais baixa primeiro
- Remove: changelog → runbooks → docs → eventos antigos → logs antigos
- Continua ate caber no limite

---

#### Orchestrator (orchestrator/)

**O que faz**: Orquestra o pipeline completo de IA — da mensagem do usuario ate a resposta.

**handleMessage — fluxo completo**:
```
1. Carrega o case (gateway.getCase)
2. Armazena mensagem do usuario (gateway.addMessage)
3. Carrega o snapshot (snapshotService.getSnapshot)
4. Processa o snapshot (contextService.processContext → sanitiza + ranqueia + corta)
5. Busca docs relevantes na base de conhecimento (knowledgeService)
6. Monta o system prompt com o SCS processado
7. Coleta as ultimas 20 mensagens da conversa
8. Resolve qual modelo usar:
   - tenant.config.preferredModel (1a prioridade)
   - tenant.config.modelPolicy (2a prioridade)
   - orchestrator default (3a prioridade)
9. Chama o LLM via OpenRouter (callLLM)
10. Registra o custo (costRecorder.record — fire-and-forget)
11. Faz parse da resposta (extrai content, actions, evidence, confidence)
12. Armazena a resposta da IA (gateway.addMessage)
13. Retorna a mensagem
```

**OpenRouter (openrouter.ts)**: Faz a chamada HTTP real para `https://openrouter.ai/api/v1/chat/completions`.
- Timeout: 30 segundos
- Retry: 2 tentativas em erros 5xx
- Custo estimado: calculado por tokens usando tabela de precos por modelo

**Modelos padrao**:
| Policy | Modelo |
|--------|--------|
| fast | anthropic/claude-sonnet-4 |
| strong | anthropic/claude-opus-4 |
| auto | Usa 'fast' por padrao |

---

#### Knowledge (knowledge/)

**O que faz**: RAG (Retrieval Augmented Generation) — busca documentos relevantes para enriquecer o contexto da IA.

**Fluxo**:
1. Extrai query de busca: mensagem do usuario + codigos de erro ativos
2. Busca candidatos via retriever (embeddings + similaridade)
3. Ordena por prioridade: Runbook > Doc > Changelog > FAQ
4. Retorna os top N documentos (padrao 5)

---

#### Escalation (escalation/)

**O que faz**: Cria tickets em sistemas externos (Zendesk, Jira) quando a IA nao resolve.

**Fluxo**:
1. Carrega case + mensagens + snapshot
2. Monta payload do ticket
3. Seleciona conector do tenant (mapa tenant → conector)
4. Chama `connector.createTicket(payload)` → retorna `{ externalId, externalUrl }`
5. Salva registro do ticket
6. Atualiza status do case para 'escalated'

---

#### Admin (admin/)

**O que faz**: CRUD de tenants, analytics, auditoria, custos de LLM, lista de modelos.

**Servicos**:
- **TenantService**: Criar, editar, listar tenants. Criptografa serviceToken (AES-256-GCM).
- **AnalyticsService**: Calcula metricas (total cases, resolution rate, CSAT, top intents, top errors).
- **AuditService**: Log paginado de todas as acoes por tenant.
- **CostService**: Registra custo por chamada LLM, agrega por mes/modelo.
- **ModelListService**: Cache de modelos disponiveis no OpenRouter (TTL 15 min).

**Rotas** (todas precisam de header `Authorization: Bearer admin-dev-key`):

| Metodo | Rota | Funcao |
|--------|------|--------|
| GET | `/api/admin/tenants` | Lista todos |
| POST | `/api/admin/tenants` | Cria novo |
| PATCH | `/api/admin/tenants/:id` | Atualiza |
| GET | `/api/admin/tenants/:id/analytics` | Metricas |
| GET | `/api/admin/tenants/:id/cases` | Lista cases |
| GET | `/api/admin/tenants/:id/costs?month=2026-02` | Custos LLM |
| GET | `/api/admin/tenants/:id/audit?page=1&pageSize=20` | Auditoria |
| GET | `/api/admin/models` | Modelos disponiveis |

### 5.4 Shared (server/src/shared/)

#### Logger (logger.ts)

5 niveis. TUDO e logado com `requestId`.

| Nivel | Nome | O que loga |
|-------|------|-----------|
| 0 | OFF | Nada |
| 1 | LOW | Erros + warnings + resumo de request |
| 2 | MEDIUM | + Queries DB + chamadas LLM + snapshots |
| 3 | HIGH | + Entrada/saida de funcoes com TODOS os params |
| 4 | PSYCHO | + Cada variavel, cada branch, cada iteracao |

**Funcoes**:
```typescript
log.error(msg, requestId?, data?)   // Sempre logado (exceto OFF)
log.warn(msg, requestId?, data?)    // Level >= LOW
log.info(msg, requestId?, data?)    // Level >= MEDIUM
log.debug(msg, requestId?, data?)   // Level >= HIGH
log.trace(msg, requestId?, data?)   // Level >= PSYCHO
log.time(label, fn, requestId?)     // Mede tempo de execucao
log.readErrors()                    // Le erros recentes
log.readRecent(count)               // Le N logs recentes
log.readRequest(requestId)          // Filtra por requestId
```

**Saida**: Console (colorido) + arquivo `logs/app-YYYY-MM-DD.log` (JSON lines). Rotacao automatica em 10MB.

#### Errors (errors.ts)

Todas as classes de erro:
```typescript
AppError             // Base (statusCode, errorCode, errorClass, field?)
├── NotFoundError    // 404, ex: "CASE_NOT_FOUND"
├── ConflictError    // 409, ex: "CONFLICT"
├── UnauthorizedError // 401, "UNAUTHORIZED"
├── ForbiddenError   // 403, "FORBIDDEN"
├── ValidationError  // 400, "VALIDATION_ERROR" (com campo)
├── RateLimitError   // 429, "RATE_LIMIT"
└── LLMError         // 502, "LLM_API_ERROR"
```

Resposta de erro sempre neste formato:
```json
{
  "statusCode": 404,
  "error": "CASE_NOT_FOUND",
  "message": "Case cas_abc123 not found",
  "requestId": "req_xyz789"
}
```

#### Auth (auth.ts)

Dois mecanismos de autenticacao:

1. **JWT (para o widget)**: O app do cliente assina um JWT com o `JWT_SECRET` compartilhado. O backend verifica a assinatura e extrai `tenantId`, `userId`, `userEmail`, `userRoles`, `plan`.

2. **API Key (para admin)**: Header `Authorization: Bearer admin-dev-key`. Comparacao timing-safe.

#### Env (env.ts)

Todas as variaveis validadas com Zod. Se faltar alguma obrigatoria, o servidor nao inicia. `resetEnvCache()` limpa o cache entre testes.

---

## 6. Widget SDK (widget/)

### O Que E

Um arquivo JavaScript puro (<50KB gzipped) que o cliente adiciona no HTML dele. Zero dependencias externas.

### Como Funciona

1. **Shadow DOM**: Cria um `<div id="ai-support-widget">` no body e attach um Shadow DOM `mode: 'open'`. Isso **isola completamente** o CSS do widget — nao afeta o site do cliente e vice-versa.

2. **FAB (Floating Action Button)**: Botao redondo fixo no canto da tela (z-index maximo: 2147483647). Clique abre/fecha o chat.

3. **Chat Panel**: Painel flutuante com header, area de mensagens com scroll, e input bar.

### Inicializacao

```javascript
const widget = AISupportWidget.init({
  tenantKey: 'ten_abc123',           // ID do tenant
  jwt: 'eyJ...',                      // JWT gerado pelo backend do cliente
  apiUrl: 'http://localhost:3002',    // URL do backend AI Support Widget
  theme: 'light',                     // 'light' ou 'dark'
  position: 'bottom-right',           // 'bottom-right' ou 'bottom-left'
  locale: 'en-US',                    // Locale para formatacao de datas
  onTokenRefresh: async () => {       // Chamado quando JWT expira (401)
    const res = await fetch('/api/support-token');
    return (await res.json()).jwt;
  }
});

widget.open();    // Abre o chat
widget.close();   // Fecha o chat
widget.destroy(); // Remove tudo do DOM
```

### Arquivos do Widget

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `widget.ts` | ~100 | Singleton, Shadow DOM, FAB, lifecycle |
| `chat.ts` | ~120 | Painel de chat, envio de mensagens, escalacao |
| `api.ts` | ~70 | Cliente HTTP com retry de JWT em 401 |
| `styles.ts` | ~200 | CSS-in-JS completo com temas light/dark |
| `actions.ts` | ~80 | Botoes de acao + dialogo de confirmacao |
| `evidence.ts` | ~50 | Badges de evidencia (error_code, job_id, timestamp, etc.) |
| `chat-renderer.ts` | ~80 | Renderiza mensagem completa (texto + evidencia + acoes + feedback) |
| `types.ts` | ~40 | Interfaces TypeScript |
| `test-helpers.ts` | ~50 | Mocks para testes |

### Fluxo de Token Refresh

```
1. Widget faz request com JWT atual
2. Backend retorna 401 (token expirado)
3. Widget chama onTokenRefresh() → novo JWT
4. Widget reenvia a request com o novo token
5. Se onTokenRefresh nao foi configurado, erro e exibido
```

### Acessibilidade (A11Y)

O widget segue WCAG 2.1 AA:
- FAB: `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`
- Chat: `role="dialog"`, `aria-labelledby`, titulo `<h2>`
- Mensagens: `role="log"`, `aria-live="polite"`
- Input: `role="form"`, `aria-label`
- Todos os botoes: `aria-label`
- Escape fecha o painel
- Tab navega entre elementos
- Dialogo de confirmacao: `role="alertdialog"`, `aria-modal="true"`, focus trap
- `prefers-reduced-motion: reduce` respeitado
- `forced-colors: active` (alto contraste) com bordas explicitas
- Touch targets minimo 44px no mobile

### Classes CSS Principais

```
.ai-widget-fab          → Botao flutuante
.ai-widget-panel        → Painel de chat
.ai-widget-header       → Header azul
.ai-widget-messages     → Container de mensagens
.ai-msg.user            → Mensagem do usuario (direita, azul)
.ai-msg.assistant       → Mensagem da IA (esquerda, cinza)
.ai-msg.system          → Mensagem do sistema (centro, italico)
.ai-evidence            → Container de evidencias
.ai-evidence-badge      → Badge individual (.error_code, .job_id, .timestamp, etc.)
.ai-actions             → Container de acoes
.ai-action-btn          → Botao de acao (.retry, .open_docs, .create_ticket, etc.)
.ai-confirm-overlay     → Fundo escuro do dialogo
.ai-confirm-box         → Caixa do dialogo
.ai-widget-input        → Barra de input
.ai-typing              → Indicador "AI is thinking..."
.ai-feedback            → Botoes de feedback (thumbs up/down)
```

---

## 7. Admin Dashboard (web/)

### Paginas

| Rota | O que faz |
|------|-----------|
| `/` | Pagina inicial com links para admin, demo, docs |
| `/admin` | Redireciona para `/admin/tenants` |
| `/admin/tenants` | Lista de tenants + botao "Create Tenant" |
| `/admin/tenants/[id]` | Detalhes e edicao de um tenant |
| `/admin/tenants/[id]/cases` | Lista de cases do tenant |
| `/admin/analytics` | Graficos e metricas por tenant |
| `/admin/audit` | Log de auditoria paginado |
| `/demo` | Pagina de demonstracao do widget |
| `/developers` | Portal do desenvolvedor com docs da API |
| `/developers/integration` | Guia passo-a-passo de integracao |

### Componentes Principais

| Componente | Props | O que faz |
|-----------|-------|-----------|
| `Sidebar` | — (usa usePathname) | Navegacao lateral. Mobile: hamburger menu |
| `CreateTenantModal` | open, onClose, onSubmit | Modal com formulario de criacao |
| `StatsGrid` | analytics | 6 cards de KPI |
| `IntentsChart` | data[] | Grafico de barras horizontal (top intents) |
| `ErrorsChart` | data[] | Grafico de barras horizontal (top errors) |
| `CostSummaryCard` | costs, loading | Resumo de custos LLM + tabela por modelo |
| `ModelPicker` | value?, onChange | Dropdown de selecao de modelo IA |

### API Client (web/src/lib/api.ts)

Todas as funcoes do frontend para chamar o backend:

```typescript
setAdminApiKey(key)                     // Configura a API key
listTenants()                           // GET /api/admin/tenants
createTenant(input)                     // POST /api/admin/tenants
updateTenant(id, input)                 // PATCH /api/admin/tenants/:id
getCases(tenantId)                      // GET /api/admin/tenants/:id/cases
getAnalytics(tenantId)                  // GET /api/admin/tenants/:id/analytics
getCosts(tenantId, month?)              // GET /api/admin/tenants/:id/costs
getAuditLog(tenantId, page?, pageSize?) // GET /api/admin/tenants/:id/audit
listModels()                            // GET /api/admin/models
```

Cada funcao adiciona automaticamente o header `Authorization: Bearer {apiKey}`.

---

## 8. Tipos Compartilhados (shared/)

Os tipos sao sincronizados em 3 arquivos identicos:
- `shared/types.ts` (fonte da verdade)
- `server/src/shared/types.ts`
- `web/src/lib/types.ts`

### IDs Prefixados

| Prefixo | Entidade | Exemplo |
|---------|----------|---------|
| `ten_` | Tenant | `ten_a1b2c3d4e5f6` |
| `usr_` | User | `usr_xyz789` |
| `cas_` | Case | `cas_abc123` |
| `scs_` | Snapshot | `scs_def456` |
| `msg_` | Message | `msg_ghi789` |

### Entidades Principais

**Case** — Uma conversa de suporte:
```typescript
interface Case {
  id: CaseId
  tenantId: TenantId
  userId: UserId
  status: 'active' | 'resolved' | 'escalated'
  snapshotId: SnapshotId
  createdAt: string          // ISO 8601
  updatedAt: string
  resolvedAt: string | null
  messageCount: number
  feedback: 'positive' | 'negative' | null
}
```

**Message** — Uma mensagem dentro de um case:
```typescript
interface Message {
  id: MessageId
  caseId: CaseId
  role: 'user' | 'assistant' | 'system'
  content: string
  actions: SuggestedAction[]   // Botoes que a IA sugere
  evidence: Evidence[]          // Dados concretos citados
  confidence: number | null     // 0-1
  createdAt: string
}
```

**SuggestedAction** — Acao sugerida pela IA:
```typescript
interface SuggestedAction {
  type: 'retry' | 'open_docs' | 'create_ticket' | 'request_access' | 'custom'
  label: string                // "Retry upload"
  payload: Record<string, unknown>
}
```

**Evidence** — Evidencia factual citada pela IA:
```typescript
interface Evidence {
  type: 'error_code' | 'job_id' | 'timestamp' | 'resource_id' | 'log_excerpt'
  label: string
  value: string
}
```

**Tenant** — Empresa cliente:
```typescript
interface Tenant {
  id: TenantId
  name: string
  plan: 'starter' | 'pro' | 'enterprise'
  config: TenantConfig
  createdAt: string
}

interface TenantConfig {
  maxContextBytes: number
  maxEventWindowHours: number
  maxLogLines: number
  maxDocs: number
  modelPolicy: 'fast' | 'strong' | 'auto'
  preferredModel?: string
  retentionDays: number
  enabledConnectors: string[]
}
```

---

## 9. Sistema de Autenticacao

### JWT (Widget → Backend)

O **app do cliente** gera um JWT com esses campos:

```typescript
interface WidgetAuthPayload {
  tenantId: string    // ten_... (deve existir no sistema)
  userId: string      // usr_... (ID do usuario do cliente)
  userEmail: string
  userRoles: string[] // ['user'] ou ['admin']
  plan: string        // 'starter', 'pro', 'enterprise'
  iat: number         // Issued at (automatico)
  exp: number         // Expiration (automatico, 8h)
}
```

**Exemplo de geracao (Node.js)**:
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  tenantId: 'ten_a1b2c3',
  userId: 'usr_' + user.id,
  userEmail: user.email,
  userRoles: ['user'],
  plan: 'pro'
}, process.env.JWT_SECRET, { expiresIn: '8h' });
```

> O `JWT_SECRET` DEVE ser identico no `.env` do ai-support-widget e no backend do cliente.

### API Key (Admin)

O admin dashboard usa uma API key estatica:
```
Authorization: Bearer admin-dev-key
```

Em producao, substituir por uma chave segura.

---

## 10. Fluxo Completo de uma Conversa

```
PASSO 1: Usuario clica no FAB (botao redondo)
    → Widget abre o chat panel

PASSO 2: Usuario digita "Nao consigo fazer upload"
    → Widget envia POST /api/cases { message: "Nao consigo fazer upload" }

PASSO 3: Backend cria o Case
    → Gateway gera cas_xxx, scs_xxx, msg_xxx
    → Armazena case + primeira mensagem
    → Log de auditoria: "case_created"

PASSO 4: Backend constroi o Snapshot (SCS)
    → Chama 4 endpoints do cliente em paralelo:
       /support/user-state    → erros ativos, limites atingidos
       /support/user-history  → upload tentado ha 5 min, clicou em retry
       /support/user-logs     → POST /api/upload → 413 UPLOAD_TOO_LARGE
       /support/business-rules → maxUploadSize: 500MB

PASSO 5: Backend sanitiza o SCS
    → redactSecrets: remove API keys
    → maskPII: "user@mail.com" → "u***@m***.com"
    → removeBinary: tira blobs
    → stripInternalUrls: remove IPs internos

PASSO 6: Backend ranqueia e corta
    → Prioridade 1: identity + productState (nunca cortado)
    → Prioridade 2: recentActivity + backend (ordenado por recencia)
    → Prioridade 3: knowledgePack (cortado se exceder limite)

PASSO 7: Backend busca docs relevantes (RAG)
    → Query: "upload" + "UPLOAD_TOO_LARGE"
    → Retorna: runbook "File Upload Troubleshooting"

PASSO 8: Backend chama a IA via OpenRouter
    → System prompt com SCS processado + docs
    → Mensagens da conversa (ultimas 20)
    → Modelo: tenant.preferredModel ou policy default
    → Timeout: 30s, retry em 5xx

PASSO 9: Backend registra custo (fire-and-forget)
    → model, tokensIn, tokensOut, estimatedCost, tenantId, caseId

PASSO 10: Backend faz parse da resposta da IA
    → Extrai: content, suggestedActions, evidence, confidence

PASSO 11: Widget exibe a resposta
    → Texto: "Vejo um erro UPLOAD_TOO_LARGE no seu upload recente..."
    → Evidence badges: [Error: UPLOAD_TOO_LARGE] [Job: job_abc] [10:30 AM]
    → Action buttons: [Retry upload] [View docs] [Create ticket]
    → Feedback: [👍] [👎]

PASSO 12: Usuario clica "Retry upload"
    → Sem confirmacao (nao e destrutivo)
    → POST /api/cases/cas_xxx/actions → "Retry iniciado"

PASSO 13: Usuario clica [👍]
    → POST /api/cases/cas_xxx/feedback { feedback: "positive" }
    → Botoes substituidos por "Thanks for your feedback!"
```

---

## 11. Como Cadastrar um Novo Tenant

### Pelo Dashboard (recomendado para iniciantes)

1. Abra **http://localhost:3003/admin/tenants**
2. Clique **"Create Tenant"**
3. Preencha:
   - **Name**: Nome da empresa
   - **Plan**: starter / pro / enterprise
   - **API Base URL**: URL base da API do cliente (ex: `https://api.acme.com`)
   - **Service Token**: Token secreto que o ai-support-widget vai usar para chamar as APIs do cliente
4. Clique **"Create"**
5. Anote o `tenantId` retornado (ex: `ten_a1b2c3d4e5f6`)

### Pela API

```bash
curl -X POST http://localhost:3002/api/admin/tenants \
  -H "Authorization: Bearer admin-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Empresa",
    "plan": "pro",
    "apiBaseUrl": "https://api.minhaempresa.com",
    "serviceToken": "token-secreto-123"
  }'
```

### Configurando o Tenant

Apos criar, acesse `/admin/tenants/[id]` para ajustar:

| Campo | O que faz | Padrao (Pro) |
|-------|-----------|-------------|
| Max Context Bytes | Tamanho maximo do SCS | 5,000,000 (5MB) |
| Max Event Window | Janela de coleta de eventos | 72 horas |
| Max Log Lines | Quantidade de linhas de log | 500 |
| Max Docs | Documentos no knowledge pack | 20 |
| Model Policy | Qual modelo IA usar | auto |
| Preferred Model | Modelo especifico (override) | — |
| Retention Days | Quanto tempo manter dados | 90 dias |
| Connectors | email, zendesk, jira | email, zendesk |

---

## 12. Como Integrar o Widget no App do Cliente

### O que o cliente precisa fazer

#### A) Backend: Gerar JWT

Crie um endpoint que retorne um JWT assinado com o `JWT_SECRET` compartilhado:

```javascript
// Exemplo: Express/Fastify
app.get('/api/support-token', authMiddleware, (req, res) => {
  const token = jwt.sign({
    tenantId: 'ten_a1b2c3d4e5f6',
    userId: `usr_${req.user.id}`,
    userEmail: req.user.email,
    userRoles: req.user.roles,
    plan: 'pro'
  }, process.env.SHARED_JWT_SECRET, { expiresIn: '8h' });
  res.json({ jwt: token });
});
```

#### B) Backend: Implementar 4 Endpoints de Contexto (opcional mas recomendado)

Estes endpoints permitem que a IA tenha dados reais para diagnosticar:

**1. GET /support/user-state?userId=usr_123**
```json
{
  "userId": "usr_123",
  "tenantId": "ten_a1b2c3",
  "roles": ["user"],
  "plan": "pro",
  "featuresEnabled": ["upload", "download"],
  "entities": [
    { "type": "subscription", "id": "sub_1", "status": "active", "metadata": {} }
  ],
  "activeErrors": [
    { "errorCode": "UPLOAD_TOO_LARGE", "errorClass": "validation",
      "retryable": false, "userActionable": true,
      "resourceId": "file_abc", "occurredAt": "2026-02-21T09:00:00Z" }
  ],
  "limitsReached": [
    { "limit": "storage_gb", "current": 4.8, "max": 5.0 }
  ]
}
```

**2. GET /support/user-history?userId=usr_123&windowHours=72**
```json
{
  "windowHours": 72,
  "events": [
    { "ts": "2026-02-21T08:30:00Z", "event": "file_uploaded",
      "page": "/upload", "elementId": "upload-btn",
      "intent": "upload_vbo", "correlationRequestId": "req_xyz" }
  ],
  "clickTimeline": [
    { "ts": "2026-02-21T08:29:00Z", "page": "/dashboard", "action": "click_upload" }
  ]
}
```

**3. GET /support/user-logs?userId=usr_123&windowHours=72**
```json
{
  "recentRequests": [
    { "ts": "2026-02-21T08:30:05Z", "route": "POST /api/upload",
      "httpStatus": 413, "errorCode": "UPLOAD_TOO_LARGE",
      "resourceId": "file_abc", "timingMs": 150, "requestId": "req_xyz" }
  ],
  "jobs": [
    { "jobId": "job_456", "queue": "parse", "status": "failed",
      "errorCode": "PARSE_INVALID", "lastStage": "header_validation",
      "createdAt": "2026-02-21T08:31:00Z", "updatedAt": "2026-02-21T08:31:02Z",
      "durationMs": 2000 }
  ],
  "errors": []
}
```

**4. GET /support/business-rules**
```json
{
  "rules": { "maxUploadSizeMb": 500, "allowedFileTypes": [".vbo", ".mp4"] },
  "errorCatalog": [
    { "errorCode": "UPLOAD_TOO_LARGE", "errorClass": "validation",
      "retryable": false, "userActionable": true,
      "resolution": "Reduce file size or split into smaller files" }
  ]
}
```

> Se esses endpoints nao forem implementados, o widget funciona mas a IA tera menos contexto.

#### C) Frontend: Adicionar o Widget

```html
<script src="https://cdn.example.com/ai-support-widget.js"></script>
<script>
  fetch('/api/support-token')
    .then(r => r.json())
    .then(({ jwt }) => {
      AISupportWidget.init({
        tenantKey: 'ten_a1b2c3d4e5f6',
        jwt: jwt,
        apiUrl: 'https://support-api.example.com',
        theme: 'light',
        position: 'bottom-right',
        locale: 'pt-BR',
        onTokenRefresh: async () => {
          const res = await fetch('/api/support-token');
          return (await res.json()).jwt;
        }
      });
    });
</script>
```

---

## 13. Seguranca e Sanitizacao

### O que NUNCA e enviado para a IA

- Auth tokens, API keys, segredos
- Connection strings, pre-signed URLs
- Dados de outros tenants
- Conteudo binario sem consentimento
- Endpoints internos, IPs, hostnames

### Pipeline de Sanitizacao (OBRIGATORIO antes de cada chamada LLM)

1. `redactSecrets()` — regex + allowlist
2. `maskPII()` — `user@mail.com` → `u***@m***.com`
3. `removeBinary()` — remove payloads base64 grandes
4. `stripInternalUrls()` — remove IPs privados e hostnames internos
5. `validateSchema()` — garante que SCS tem a estrutura correta
6. `logAudit()` — registra o que foi enviado

### Isolamento de Tenant

- **Toda query** ao banco inclui `tenantId` no WHERE
- **Todo snapshot** verifica que tenantId bate com userId
- **Testes automatizados** verificam que acesso cross-tenant e bloqueado

### Criptografia

- Service tokens: AES-256-GCM com chave derivada de SHA256(TOKEN_ENCRYPTION_KEY)
- Senhas: (nao aplicavel — auth e via JWT do cliente)
- JWT: HMAC-SHA256

---

## 14. Sistema de Logs

### Onde ficam

- **Console**: Saida colorida em tempo real
- **Arquivo**: `logs/app-YYYY-MM-DD.log` (JSON lines)
- **Rotacao**: Automatica em 10MB, mantem 5 arquivos

### Como ler

```bash
# Ultimas 100 linhas
tail -n 100 logs/app-*.log

# Filtrar erros
grep '"level":"ERROR"' logs/app-*.log

# Rastrear por requestId
grep "req_abc123def456" logs/app-*.log
```

### Formato de cada linha (JSON)

```json
{
  "timestamp": "2026-02-21T10:30:45.123Z",
  "level": "INFO",
  "message": "Snapshot built",
  "requestId": "req_abc123def456",
  "data": { "snapshotId": "scs_xyz789", "bytesTotal": 2500000 }
}
```

---

## 15. Testes

### Como rodar

```bash
cd server && npx vitest run    # ~228 testes
cd web && npx vitest run       # ~28 testes
cd widget && npx vitest run    # ~26 testes
```

### Padrao de Testes

- **Arquivos de teste ficam ao lado do codigo fonte**: `cost.service.ts` → `cost.test.ts`
- **Mocks em memoria**: Sem banco real, sem Redis real
- **Fastify inject()**: Para testes de rota, usa `app.inject()` em vez de HTTP real
- **Mock fetch**: Monkey-patch `globalThis.fetch` nos testes, restaura no `finally`
- **vitest-axe**: Testes automaticos de acessibilidade (WCAG 2.1 AA)

### Exemplo de teste (simplificado)

```typescript
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { createCostService, createMemCostStore } from './cost.service.js';

describe('GET /api/admin/tenants/:id/costs', () => {
  it('returns monthly cost summary', async () => {
    const costService = createCostService(createMemCostStore());
    await costService.record({ tenantId: 'ten_1', model: 'gpt-4', ... });

    const app = await buildApp({ adminRouteOpts: { costService, ... } });
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/tenants/ten_1/costs?month=2026-02',
      headers: { authorization: 'Bearer admin-dev-key' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().costs.totalCost).toBeGreaterThan(0);
  });
});
```

---

## 16. Resolucao de Problemas

| Problema | Causa Provavel | Solucao |
|---------|---------------|---------|
| Server nao inicia | Docker parado ou porta ocupada | `docker ps` + verificar portas |
| CORS error no browser | Origem nao listada | Adicionar em `CORS_ORIGINS` no `.env` |
| JWT invalid | Secret diferente | Mesmo `JWT_SECRET` no backend e no cliente |
| Widget nao aparece | Erro no JS, apiUrl errado | Verificar console do browser (F12) |
| IA nao responde | API key invalida ou sem saldo | Verificar `OPENROUTER_API_KEY` |
| IA responde generico | Endpoints de contexto nao implementados | Implementar os 4 endpoints `/support/*` |
| Timeout em chamada LLM | Modelo lento ou overloaded | Trocar para modelo 'fast', verificar logs |
| Case nao encontrado | tenantId nao bate | Verificar se JWT tem o tenantId correto |
| Dados de outro tenant | Bug critico | Toda query DEVE ter tenantId no WHERE |

### Debugging com Logs

```bash
# 1. Verificar erros recentes
grep '"level":"ERROR"' logs/app-*.log | tail -20

# 2. Rastrear uma request especifica
grep "req_abc123" logs/app-*.log

# 3. Ver todas as chamadas LLM
grep "callLLM" logs/app-*.log

# 4. Ver custos registrados
grep "Cost recorded" logs/app-*.log

# 5. Aumentar nivel de log para debug
# No .env: LOG_LEVEL=high (ou psycho para maximo detalhe)
```

---

## 17. Glossario

| Termo | Significado |
|-------|-------------|
| **Tenant** | Empresa-cliente que usa o widget. ID unico: `ten_xxx` |
| **Case** | Uma conversa de suporte. ID: `cas_xxx` |
| **Message** | Uma mensagem dentro de um case. ID: `msg_xxx` |
| **SCS / Snapshot** | Support Context Snapshot — fotografia do estado do usuario. ID: `scs_xxx` |
| **Evidence** | Dado concreto citado pela IA (error code, job ID, timestamp) |
| **SuggestedAction** | Botao de acao sugerido pela IA (retry, docs, ticket) |
| **Escalation** | Quando a IA nao resolve e cria ticket para humano |
| **FAB** | Floating Action Button — botao redondo no canto da tela |
| **Shadow DOM** | Tecnica do browser que isola CSS do widget |
| **OpenRouter** | Servico que da acesso a multiplos modelos de IA |
| **RAG** | Retrieval Augmented Generation — busca de docs para enriquecer contexto |
| **Fire-and-forget** | Operacao que nao bloqueia a resposta (ex: registrar custo) |
| **DI** | Dependency Injection — injecao de dependencias via factory functions |
| **requestId** | ID unico por request, propagado em todos os logs |
| **AppError** | Classe base de erro com statusCode e errorCode |
| **TenantConfig** | Configuracoes personalizaveis por tenant |
| **Rate Limiter** | Limita requests por usuario/tempo (ex: 10 cases/min) |
| **Context Service** | Sanitiza + ranqueia + corta o SCS antes da IA |
| **Knowledge Base** | Base de documentos para RAG |
| **Connector** | Integracao com sistema externo (Zendesk, Jira, email) |
