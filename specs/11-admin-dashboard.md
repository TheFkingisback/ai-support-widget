# Sprint 11: Admin Dashboard

## Objective
Build the admin web app with tenant management, analytics, and case browsing.

## IMPORTANT: Read actual backend routes FIRST
Before building ANY component, read server/src/modules/admin/admin.routes.ts to verify exact endpoints and response shapes.

## Tasks

### 1. Initialize Next.js (web/)
- `npx create-next-app@latest web --typescript --tailwind --app --src-dir`
- Install: @tanstack/react-query react-hook-form @hookform/resolvers zod recharts lucide-react

### 2. Admin Layout (web/src/app/admin/layout.tsx)
- Sidebar: Tenants, Analytics, Audit Log
- Topbar: "AI Support Admin" + logout
- Dark professional theme
- Responsive

### 3. Tenants Page (web/src/app/admin/tenants/page.tsx)
- Table: name, plan, cases count, resolution rate, created date
- "Create Tenant" button → modal
- Click row → tenant detail page

### 4. Tenant Detail (web/src/app/admin/tenants/[id]/page.tsx)
- Config editor: maxContextBytes, maxEventWindowHours, maxLogLines, modelPolicy, retentionDays
- Connectors: enable/disable Zendesk, Jira, Email
- API integration: shows baseUrl, serviceToken (masked)
- Save button with validation

### 5. Analytics Page (web/src/app/admin/analytics/page.tsx)
- Tenant selector dropdown
- Stats grid: resolution rate, avg messages, avg time to resolve, CSAT
- Charts:
  - Resolution rate over time (line chart)
  - Top intents (bar chart)
  - Top errors (bar chart)
  - CSAT trend (line chart)
- Date range picker

### 6. Cases Browser (web/src/app/admin/tenants/[id]/cases/page.tsx)
- Table: caseId, userId, status, messages count, created, resolved
- Click row → case detail with full conversation
- Filter by status (active/resolved/escalated)

### 7. Audit Log (web/src/app/admin/audit/page.tsx)
- Table: timestamp, tenant, user, action, details
- Filter by tenant, date range
- Paginated

### 8. Widget Demo Page (web/src/app/demo/page.tsx)
- Embeds the widget SDK
- Shows how a host app would integrate
- Test with mock JWT
- "This is how your users will see it"

## Tests
1. Tenants table renders tenant list
2. Create tenant modal validates required fields
3. Tenant detail loads and displays config
4. Tenant detail saves updated config
5. Analytics shows resolution rate chart
6. Analytics shows top errors chart
7. Cases table renders with correct statuses
8. Case detail shows full conversation
9. Audit log renders paginated entries
10. Widget demo page embeds widget correctly

## Definition of Done
- All 10 tests pass
- Admin dashboard navigable and functional
- Analytics charts render with data
- Widget demo page works
