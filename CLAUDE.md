# AI Support Widget — AI Development Guidelines

## What Is This Project

An embeddable AI support widget that diagnoses user problems by analyzing real system state. When a user opens support, the system generates a Support Context Snapshot (SCS) containing account state, recent actions, backend logs, and business rules. The AI doesn't guess — it investigates with evidence.

The product is multi-tenant SaaS, sold as an SDK that any SaaS company can embed.

## Architecture

Modular monolith. One deployable backend, one frontend app.

```
[Host App] → [Widget SDK (JS embed)] → [Support Gateway (Fastify)]
                                              |
                                    +---------+---------+
                                    |                   |
                              [Snapshot Builder]  [AI Orchestrator]
                                    |                   |
                              [Context Processor] [OpenRouter LLM]
                                    |                   |
                              [Client APIs]       [Escalation Engine]
                              [Knowledge Base]    [Ticketing System]
```

## Tech Stack (DO NOT CHANGE)

### Backend (server/)
- Runtime: Node.js 20+
- API: Fastify 5
- Language: TypeScript (strict)
- ORM: Drizzle ORM (PostgreSQL)
- Queue: BullMQ (Redis)
- LLM: OpenRouter API (multi-model)
- Embeddings: OpenAI text-embedding-3-small (for RAG)
- Vector Store: pgvector (PostgreSQL extension)
- Auth: JWT verification (tokens signed by host app)
- Test: Vitest + Supertest
- Lint: ESLint + Prettier

### Frontend (web/)
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict)
- Styling: Tailwind CSS
- State: React Query (TanStack Query)
- Forms: React Hook Form + Zod
- Charts: Recharts
- Icons: Lucide React
- Test: Vitest + React Testing Library

### Widget SDK (widget/)
- Pure TypeScript, zero dependencies
- Builds to a single JS file (<50KB gzipped)
- CSS-in-JS (injected styles, no external CSS)
- Shadow DOM for style isolation
- Communicates with Gateway via REST

### Infrastructure
- PostgreSQL 16 + pgvector
- Redis 7 (BullMQ queues)
- Docker Compose for local dev

## Project Structure

```
ai-support-widget/
├── CLAUDE.md
├── API-CONTRACT.md
├── docker-compose.yml
├── server/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── gateway/        # Case management, message routing
│   │   │   ├── snapshot/       # SCS generation, client API calls
│   │   │   ├── context/        # Sanitization, ranking, trimming
│   │   │   ├── orchestrator/   # LLM calls via OpenRouter
│   │   │   ├── knowledge/      # RAG: indexing, embeddings, retrieval
│   │   │   ├── escalation/     # Ticket creation (Zendesk/Jira)
│   │   │   └── admin/          # Tenant management, analytics
│   │   ├── shared/
│   │   │   ├── logger.ts       # 5-level logger (OFF→PSYCHO)
│   │   │   ├── log-investigator.ts
│   │   │   ├── errors.ts       # Typed error classes
│   │   │   ├── db.ts           # Drizzle connection
│   │   │   ├── redis.ts        # Redis/BullMQ connection
│   │   │   ├── auth.ts         # JWT verification middleware
│   │   │   └── types.ts        # Shared types (from API-CONTRACT.md)
│   │   └── app.ts              # Fastify app setup
│   ├── package.json
│   └── tsconfig.json
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/          # Admin dashboard pages
│   │   │   ├── demo/           # Widget demo/test page
│   │   │   ├── developers/     # API documentation page
│   │   │   └── api/            # API proxy
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── tsconfig.json
├── widget/                      # Embeddable SDK
│   ├── src/
│   │   ├── widget.ts           # Main entry, Shadow DOM
│   │   ├── chat.ts             # Chat UI
│   │   ├── api.ts              # Gateway communication
│   │   └── styles.ts           # CSS-in-JS
│   ├── package.json
│   └── tsconfig.json
├── shared/                      # Shared types
│   └── types.ts
└── logs/
```

## Coding Rules

1. **Every file under 200 lines.** Split if longer.
2. **No `any` type.** Use `unknown` and narrow.
3. **All API calls go through typed clients.** No raw fetch in components.
4. **All inputs validated** with Zod or Typebox schemas.
5. **All errors are typed AppError subclasses** with error codes from the taxonomy.
6. **Error codes follow taxonomy:** `DOMAIN_REASON` (e.g., `UPLOAD_TOO_LARGE`, `CASE_NOT_FOUND`).
7. **No console.log.** Use the project logger EVERYWHERE.
8. **Cross-module communication via typed interfaces only.**
9. **Every async operation in try/catch** with proper error logging.
10. **requestId propagated through every function call.**

## File Safety Rules (CRITICAL)

11. **Read full file content before editing.** Never edit partially-seen files.
12. **No debug artifacts in commits.** No tmp/, no console.log.
13. **Check for existing similar files** before creating new ones.

## Logging System (MANDATORY)

5 levels. EVERYTHING gets logged. requestId ties it all together.

| Level | Name | What Gets Logged |
|-------|------|-----------------|
| 0 | OFF | Nothing |
| 1 | LOW | Errors + warnings + request summary (method, path, status, ms) |
| 2 | MEDIUM | + DB queries + LLM calls + snapshot generation + sanitization |
| 3 | HIGH | + Function entry/exit with ALL params + timing |
| 4 | PSYCHO | + Every variable + every branch + every loop iteration |

### Logger Rules
1. Every route handler: log request received (MEDIUM) + response (MEDIUM) + errors (LOW)
2. Every LLM call: log model, tokens in/out, latency, cost estimate (MEDIUM)
3. Every snapshot generation: log sources consulted, bytes, truncation counts (MEDIUM)
4. Every sanitization pass: log fields removed, PII masked (MEDIUM)
5. Every client API call (getUserState etc.): log URL, status, timing (MEDIUM)
6. Every DB query: log name, params, rows, timing (MEDIUM)
7. Every function entry/exit: log params and return (HIGH)
8. Every business logic branch: log which path taken (PSYCHO)

Config: `LOG_LEVEL=off|low|medium|high|psycho` in .env. Default: medium.
Writes to: console (colored) + `logs/app-YYYY-MM-DD.log` (JSON lines).

## Debugging Rules (CRITICAL)

When ANYTHING goes wrong:
1. **READ THE LOG FILE FIRST:** `cat logs/app-*.log | tail -100`
2. **FILTER FOR ERRORS:** `grep '"level":"ERROR"' logs/app-*.log`
3. **TRACE by requestId:** `grep "req_xxx" logs/app-*.log`
4. **UNDERSTAND** from logs BEFORE touching code
5. **THEN** open source files to fix

## Security Rules (from PRD Section 9)

### NEVER send to LLM:
- Auth tokens, API keys, secrets
- Connection strings, pre-signed URLs
- Data from other tenants
- Raw file content without consent
- Internal endpoints, IPs, hostnames

### Sanitization Pipeline (mandatory before every LLM call):
1. `redactSecrets()` — regex + allowlist
2. `maskPII()` — email masking (e***@d***.com), stable hash
3. `removeBinary()` — strip file payloads
4. `stripInternalUrls()` — remove internal endpoints
5. `validateSchema()` — ensure SCS conforms
6. `logAudit()` — record what was sent

### Tenant Isolation:
- Every DB query MUST include `tenantId` in WHERE clause
- Every snapshot MUST verify tenantId matches userId
- Automated tests verify cross-tenant isolation

## Testing Rules

1. Every service function has at least one test.
2. Every route has at least one integration test.
3. External services (OpenRouter, client APIs) are mocked.
4. Sanitization has dedicated tests (verify secrets are removed).
5. Tenant isolation has dedicated tests (verify cross-tenant blocked).
6. Test files live next to source.
7. Run tests after EVERY sprint.

## Autonomy Rules (CRITICAL)

1. **Never ask for permission.** Execute commands directly.
2. **Never ask "should I...?"** Read the spec, implement, test, move on.
3. **If a command fails, read the error, fix it, retry.** Max 3 retries.
4. **If a test fails, read the log file FIRST**, then the test, then fix.

## Infrastructure Rules (CRITICAL)

1. **NEVER reuse databases.** This project gets `aiwidget_dev` database.
2. **NEVER reuse containers.** Use `aiwidget-postgres`, `aiwidget-redis`.
3. **Docker Compose with project-specific names.**

## Progress Memory (progress.txt)

After each sprint, APPEND:
```
## Sprint [N] — [Name]
- Files created: [list]
- Files modified: [list]
- Tests: [X passed, Y total]
- Learnings: [what worked, gotchas, context for next sprint]
```
READ progress.txt at START of each sprint.

## Git Rules

- Commit after each module: `feat(module): description`
- NEVER commit with failing tests.
- NEVER commit debug artifacts.
