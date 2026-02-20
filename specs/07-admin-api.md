# Sprint 7: Admin API

## Objective
Build the admin endpoints for tenant management, configuration, and analytics.

## Tasks

### 1. Schema (server/src/modules/admin/admin.schema.ts)
Tables:
- `tenants`: id (ten_...), name, plan, config (jsonb), apiBaseUrl, serviceToken (encrypted), createdAt, updatedAt
- Config fields: maxContextBytes, maxEventWindowHours, maxLogLines, maxDocs, modelPolicy, retentionDays, enabledConnectors

### 2. Admin Auth Middleware (server/src/modules/admin/admin-auth.ts)
- Separate auth for admin routes (API key or admin JWT)
- Admin API key stored in env (ADMIN_API_KEY)
- Rejects non-admin requests with 403

### 3. Tenant Service (server/src/modules/admin/tenant.service.ts)
- `createTenant(name, plan, config, apiBaseUrl, serviceToken)` → Tenant
  - Encrypt serviceToken before storing
  - Default config based on plan
  - Log INFO: tenant created
- `updateTenant(tenantId, updates)` → Tenant
  - Partial update of config
  - Log INFO: tenant updated with changed fields
- `getTenant(tenantId)` → Tenant
- `listTenants()` → Tenant[]

### 4. Analytics Service (server/src/modules/admin/analytics.service.ts)
- `getAnalytics(tenantId, dateRange)` → AnalyticsSummary
  - Query cases table for:
    - totalCases, resolvedWithoutHuman, resolutionRate
    - avgMessagesPerResolution, avgTimeToFirstResponse, avgTimeToResolution
  - Query messages for topIntents (from user messages, simple keyword extraction)
  - Query snapshots for topErrors (from activeErrors)
  - Query feedback for CSAT
  - Log INFO: analytics computed for tenantId

### 5. Audit Service (server/src/modules/admin/audit.service.ts)
- `getAuditLog(tenantId, page, pageSize)` → PaginatedResponse<AuditEntry>
- `purgeData(tenantId, olderThan)` → { purged: number }
  - Delete cases + messages + snapshots older than date
  - Log WARN: data purged for tenantId, count

### 6. Admin Routes (server/src/modules/admin/admin.routes.ts)
Per API-CONTRACT.md:
- GET /api/admin/tenants — list all tenants
- POST /api/admin/tenants — create tenant
- PATCH /api/admin/tenants/:id — update tenant
- GET /api/admin/tenants/:id/analytics — get analytics
- GET /api/admin/tenants/:id/cases — list cases for tenant
- GET /api/admin/tenants/:id/audit — get audit log

## Tests
1. createTenant stores tenant with encrypted serviceToken
2. createTenant sets default config based on plan
3. updateTenant partially updates config
4. getTenant returns tenant by ID
5. getAnalytics returns correct resolution rate
6. getAnalytics returns top errors from snapshots
7. getAuditLog returns paginated entries
8. purgeData removes old cases and snapshots
9. Admin routes reject non-admin requests with 403
10. listTenants returns all tenants

## Definition of Done
- `npx vitest run` — all 10 tests pass
- Tenant CRUD works
- Analytics compute correctly from test data
- Audit log records and retrieves
- Data purge works
- Admin auth protects all routes
