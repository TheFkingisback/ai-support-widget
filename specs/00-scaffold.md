# Sprint 0: Project Scaffold + Logger + Shared Types

## Objective
Set up monorepo, install dependencies, create logger, shared types, Docker Compose, and base app shell.

## Tasks

### 1. Initialize Monorepo
- Root package.json with workspaces: ["server", "web", "widget", "shared"]
- `mkdir server web widget shared`
- Initialize each with package.json and tsconfig.json

### 2. Server Dependencies
```
cd server
npm init -y
npm install fastify @fastify/cors @fastify/jwt @fastify/swagger @fastify/swagger-ui drizzle-orm postgres bullmq ioredis zod
npm install -D typescript vitest supertest @types/node tsx drizzle-kit
```

### 3. Shared Types (shared/types.ts)
Copy ALL types from API-CONTRACT.md into shared/types.ts. Export everything.
These are the SINGLE SOURCE OF TRUTH. Both server and web import from here.

### 4. Logger (server/src/shared/logger.ts)
Implement the full 5-level logger per CLAUDE.md:
- OFF, LOW, MEDIUM, HIGH, PSYCHO
- Console (colored) + file (JSON lines) output
- `logs/app-YYYY-MM-DD.log`
- requestId in every entry
- `log.readErrors()`, `log.readRecent()`, `log.readRequest(id)` helpers
- `log.time()` for measuring async functions

### 5. Log Investigator (server/src/shared/log-investigator.ts)
- `investigate()` — prints error summary + last 20 entries
- `traceRequest(requestId)` — shows full lifecycle of one request

### 6. Error Classes (server/src/shared/errors.ts)
- AppError base with statusCode, errorCode, errorClass
- NotFoundError (404), ConflictError (409), UnauthorizedError (401)
- ForbiddenError (403), ValidationError (400), RateLimitError (429)
- Every error auto-logged at LOW level when thrown

### 7. Database (server/src/shared/db.ts)
- Drizzle connection using DATABASE_URL from env
- Connection pool config

### 8. Redis (server/src/shared/redis.ts)
- ioredis connection using REDIS_URL from env
- BullMQ queue factory helper

### 9. Auth Middleware (server/src/shared/auth.ts)
- JWT verification middleware for Fastify
- Extracts tenantId, userId, roles from token
- Attaches to request object
- Rejects invalid/expired tokens with 401

### 10. Fastify App (server/src/app.ts)
- Create Fastify instance with logger disabled (we use our own)
- Register CORS, auth middleware
- requestId generation middleware (crypto.randomUUID)
- Request/response logging at MEDIUM level
- Error handler that returns ApiError format
- Health check route: GET /api/health

### 11. Environment Config (server/src/shared/env.ts)
- Zod validation of all env vars
- Required: DATABASE_URL, REDIS_URL, JWT_SECRET, OPENROUTER_API_KEY
- Optional: LOG_LEVEL (default: medium), PORT (default: 3000)
- MAX_CONTEXT_BYTES (default: 5000000)

### 12. Docker Compose (docker-compose.yml)
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: aiwidget-postgres
    environment:
      POSTGRES_DB: aiwidget_dev
      POSTGRES_USER: aiwidget
      POSTGRES_PASSWORD: ${DB_PASSWORD:-devpassword}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - aiwidget-pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    container_name: aiwidget-redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
volumes:
  aiwidget-pgdata:
```

### 13. Config Files
- .env with all required vars (dev defaults)
- .gitignore: node_modules, dist, .next, .env, logs/, tmp/
- progress.txt with header
- vitest.config.ts

## Tests
1. Logger writes ERROR to file at LOW level
2. Logger skips DEBUG at LOW level
3. Logger writes all levels at PSYCHO
4. log.readErrors() returns only ERROR entries
5. log.readRequest(id) filters by requestId
6. log.time() measures elapsed time
7. AppError has correct statusCode and errorCode
8. Auth middleware rejects invalid JWT with 401
9. Auth middleware extracts tenantId from valid JWT
10. Health check returns 200 with version

## Definition of Done
- `npm run build` succeeds in server/
- `npx vitest run` — all 10 tests pass
- `docker compose up -d` starts postgres + redis
- Logger writes to logs/ directory
- Shared types compile without errors
