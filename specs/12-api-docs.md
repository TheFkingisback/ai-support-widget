# Sprint 12: API Documentation + Developer Portal

## Objective
Generate interactive API docs and a public developer portal for SDK integration.

## Tasks

### 1. Swagger/OpenAPI (server side)
- Register @fastify/swagger and @fastify/swagger-ui
- Auto-generate OpenAPI 3.0 spec from all routes
- Serve at /api/docs (interactive)
- Dark theme

### 2. Developer Portal (web/src/app/developers/page.tsx)
Public page with:

**Quick Start:**
```
1. Get your tenant key and JWT secret from admin dashboard
2. Add the widget script to your page
3. Implement 4 API endpoints
4. Done — your users have AI support
```

**Widget Integration:**
```html
<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
<script>
  AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: yourUserJwt,
    theme: 'light',
    position: 'bottom-right'
  });
</script>
```

**4 Required Endpoints:**
Document each with request/response examples:
- GET /support/user-state
- GET /support/user-history
- GET /support/user-logs
- GET /support/business-rules

**Code Examples** in JavaScript, Python, cURL

**Error Handling:** standard ApiError format

### 3. SDK Integration Guide (web/src/app/developers/integration/page.tsx)
Step-by-step guide:
1. Create tenant via admin dashboard
2. Configure JWT shared secret
3. Implement 4 endpoints
4. Add widget script tag
5. Test with demo page
6. Go live

## Tests
1. /api/docs serves Swagger UI
2. OpenAPI spec includes all routes
3. Developer portal renders Quick Start section
4. Developer portal renders code examples
5. Integration guide renders all steps

## Definition of Done
- All 5 tests pass
- /api/docs shows interactive API docs
- Developer portal is comprehensive
- Integration guide is step-by-step
