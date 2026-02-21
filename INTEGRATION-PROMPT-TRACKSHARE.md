# Prompt para IA: Integrar TrackShare como Tenant do AI Support Widget

> Cole este prompt inteiro para a IA que vai trabalhar no projeto TrackShare.

---

## Contexto

Existe um produto chamado **AI Support Widget** rodando na maquina. Ele e um chatbot de suporte inteligente que se embute em qualquer aplicacao web. Voce precisa integrar o **TrackShare** como um tenant (cliente) desse widget.

O AI Support Widget esta rodando em:
- **Backend**: http://localhost:3002
- **Admin Dashboard**: http://localhost:3003
- **Admin API Key**: `admin-dev-key`

O TrackShare esta rodando em:
- **Backend Fastify**: http://localhost:3001
- **Frontend Next.js**: http://localhost:3000
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6380
- **MinIO (S3)**: localhost:9000

## O Que Voce Precisa Fazer

### PASSO 1: Cadastrar o TrackShare como Tenant

Faça esta chamada para registrar o TrackShare no AI Support Widget:

```bash
curl -X POST http://localhost:3002/api/admin/tenants \
  -H "Authorization: Bearer admin-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TrackShare",
    "plan": "pro",
    "apiBaseUrl": "http://localhost:3001",
    "serviceToken": "trackshare-integration-token"
  }'
```

Anote o `tenantId` retornado (ex: `ten_xxxxx`). Voce vai precisar dele em todos os passos seguintes.

### PASSO 2: Compartilhar JWT Secret

O AI Support Widget e o TrackShare precisam usar o **mesmo JWT secret** para que os tokens gerados pelo TrackShare sejam validados pelo widget.

1. Leia o JWT_SECRET do `.env` do AI Support Widget (em `C:\ai-support-widget\.env`)
2. Adicione essa mesma variavel no `.env` do TrackShare:
   ```
   WIDGET_JWT_SECRET=<mesmo-valor-do-JWT_SECRET-do-ai-support-widget>
   WIDGET_TENANT_ID=<tenantId-retornado-no-passo-1>
   ```
3. Registre essas variaveis no `env.ts` do TrackShare (validacao Zod)

### PASSO 3: Criar Endpoint de Token no TrackShare

Crie um novo endpoint no TrackShare que gere um JWT para o widget:

```
GET /api/support/token
Auth: JWT do TrackShare (usuario logado)
```

**Implementacao**:
```typescript
import jwt from 'jsonwebtoken';

// No route handler do Fastify:
app.get('/api/support/token', { preHandler: [authMiddleware] }, async (req, reply) => {
  const user = req.user; // Do auth middleware existente do TrackShare

  const token = jwt.sign({
    tenantId: process.env.WIDGET_TENANT_ID,  // ten_xxxxx
    userId: `usr_${user.id}`,
    userEmail: user.email,
    userRoles: [user.role],      // 'user' ou 'admin'
    plan: 'pro'
  }, process.env.WIDGET_JWT_SECRET, { expiresIn: '8h' });

  return { jwt: token };
});
```

### PASSO 4: Implementar os 4 Endpoints de Contexto

Estes endpoints permitem que o AI Support Widget colete dados reais do usuario para dar respostas inteligentes. Crie-os no TrackShare.

#### 4.1 GET /support/user-state?userId=usr_XXX

Retorna o estado atual do usuario no TrackShare.

```typescript
app.get('/support/user-state', async (req, reply) => {
  const userId = (req.query as { userId: string }).userId;
  // Extrair UUID real: userId vem como "usr_<uuid>"
  const realId = userId.replace('usr_', '');

  const user = await findUserById(realId);
  if (!user) return reply.code(404).send({ error: 'User not found' });

  // Buscar entidades do usuario
  const userCars = await getUserCars(realId);
  const sessions = await getUserSessions(realId);
  const activeErrors = []; // Erros ativos recentes

  // Verificar limites
  const limitsReached = [];
  // Ex: se o usuario atingiu o limite de uploads, etc.

  return {
    userId,
    tenantId: process.env.WIDGET_TENANT_ID,
    roles: [user.role],
    plan: 'pro',
    featuresEnabled: ['upload', 'download', 'matching', 'leaderboard'],
    entities: [
      ...userCars.map(c => ({
        type: 'car', id: `car_${c.id}`, status: 'active',
        metadata: { manufacturer: c.manufacturer, model: c.model }
      })),
      ...sessions.slice(0, 5).map(s => ({
        type: 'session', id: s.id, status: s.status || 'active',
        metadata: { circuit: s.circuitName, bestLap: s.bestLapS }
      }))
    ],
    activeErrors,
    limitsReached
  };
});
```

#### 4.2 GET /support/user-history?userId=usr_XXX&windowHours=72

Retorna acoes recentes do usuario.

```typescript
app.get('/support/user-history', async (req, reply) => {
  const { userId, windowHours } = req.query as { userId: string; windowHours: string };
  const realId = userId.replace('usr_', '');
  const since = new Date(Date.now() - parseInt(windowHours) * 3600000);

  // Buscar uploads recentes
  const recentUploads = await getRecentUploads(realId, since);
  // Buscar downloads recentes
  const recentDownloads = await getRecentDownloads(realId, since);

  const events = [
    ...recentUploads.map(u => ({
      ts: u.createdAt, event: 'file_uploaded',
      page: '/upload', elementId: null,
      intent: 'upload_vbo', correlationRequestId: null
    })),
    ...recentDownloads.map(d => ({
      ts: d.createdAt, event: 'file_downloaded',
      page: '/matches', elementId: null,
      intent: 'download_data', correlationRequestId: null
    }))
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return {
    windowHours: parseInt(windowHours),
    events,
    clickTimeline: events.map(e => ({
      ts: e.ts, page: e.page, action: e.event
    }))
  };
});
```

#### 4.3 GET /support/user-logs?userId=usr_XXX&windowHours=72

Retorna logs de backend recentes (requests, jobs, erros).

```typescript
app.get('/support/user-logs', async (req, reply) => {
  const { userId, windowHours } = req.query as { userId: string; windowHours: string };
  const realId = userId.replace('usr_', '');
  const since = new Date(Date.now() - parseInt(windowHours) * 3600000);

  // Buscar uploads com erro
  const failedUploads = await getFailedUploads(realId, since);
  // Buscar jobs de parse
  const parseJobs = await getRecentParseJobs(realId, since);

  return {
    recentRequests: failedUploads.map(u => ({
      ts: u.createdAt,
      route: 'POST /api/upload/batch/:batchId/file',
      httpStatus: u.errorMessage ? 400 : 200,
      errorCode: u.errorMessage ? 'UPLOAD_FAILED' : null,
      resourceId: u.id,
      timingMs: 0,
      requestId: `req_${u.id.slice(0, 12)}`
    })),
    jobs: parseJobs.map(j => ({
      jobId: `job_${j.id}`,
      queue: 'parse',
      status: j.status,
      errorCode: j.errorMessage ? 'PARSE_FAILED' : null,
      lastStage: j.status === 'failed' ? 'vbo_parsing' : null,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt || j.createdAt,
      durationMs: j.durationMs || null
    })),
    errors: failedUploads.filter(u => u.errorMessage).map(u => ({
      ts: u.createdAt,
      errorCode: 'UPLOAD_FAILED',
      errorClass: 'validation',
      route: 'POST /api/upload',
      requestId: `req_${u.id.slice(0, 12)}`,
      resourceId: u.id
    }))
  };
});
```

#### 4.4 GET /support/business-rules

Retorna regras de negocio e catalogo de erros do TrackShare.

```typescript
app.get('/support/business-rules', async (req, reply) => {
  return {
    rules: {
      maxUploadSizeMb: 500,
      allowedFileTypes: ['.vbo'],
      matchingWindowDays: 30,
      accessExpiryDays: 30,
      maxBatchFiles: 10,
      downloadTokenExpiryMinutes: 30,
      refreshTokenExpiryDays: 7,
      accessTokenExpiryHours: 6
    },
    errorCatalog: [
      {
        errorCode: 'UPLOAD_DUPLICATE',
        errorClass: 'validation',
        retryable: false,
        userActionable: true,
        resolution: 'This file has already been uploaded (SHA-256 match). Use a different file.'
      },
      {
        errorCode: 'UPLOAD_TOO_LARGE',
        errorClass: 'validation',
        retryable: false,
        userActionable: true,
        resolution: 'File exceeds 500MB limit. Reduce file size.'
      },
      {
        errorCode: 'PARSE_INVALID_VBO',
        errorClass: 'validation',
        retryable: false,
        userActionable: true,
        resolution: 'File is not a valid VBOX VBO file. Check the file format.'
      },
      {
        errorCode: 'PARSE_NO_CIRCUIT',
        errorClass: 'business',
        retryable: false,
        userActionable: false,
        resolution: 'GPS coordinates do not match any known circuit. Contact support.'
      },
      {
        errorCode: 'PARSE_NO_LAPS',
        errorClass: 'business',
        retryable: false,
        userActionable: true,
        resolution: 'No lap crossings detected. Ensure you crossed the start/finish line.'
      },
      {
        errorCode: 'MATCH_NO_PEERS',
        errorClass: 'business',
        retryable: true,
        userActionable: false,
        resolution: 'No matching sessions found. Try again after more drivers upload.'
      },
      {
        errorCode: 'DOWNLOAD_EXPIRED',
        errorClass: 'business',
        retryable: true,
        userActionable: true,
        resolution: 'Download token expired. Request a new download.'
      },
      {
        errorCode: 'AUTH_EXPIRED',
        errorClass: 'permission',
        retryable: true,
        userActionable: true,
        resolution: 'Session expired. Please log in again.'
      },
      {
        errorCode: 'AUTH_BLOCKED',
        errorClass: 'permission',
        retryable: false,
        userActionable: false,
        resolution: 'Account has been blocked. Contact admin.'
      }
    ]
  };
});
```

### PASSO 5: Adicionar o Widget no Frontend do TrackShare

No layout principal do `trackshare-web` (provavelmente `src/app/layout.tsx` ou um componente global), adicione:

```tsx
'use client';
import { useEffect, useRef } from 'react';

function SupportWidget() {
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Carregar script do widget
    const script = document.createElement('script');
    script.src = 'http://localhost:3002/widget.js'; // ou caminho do build
    script.async = true;
    script.onload = () => {
      initWidget();
    };
    document.body.appendChild(script);

    async function initWidget() {
      try {
        const res = await fetch('/api/support/token', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (!res.ok) return;
        const { jwt } = await res.json();

        widgetRef.current = (window as any).AISupportWidget.init({
          tenantKey: process.env.NEXT_PUBLIC_WIDGET_TENANT_ID, // ten_xxxxx
          jwt,
          apiUrl: 'http://localhost:3002',
          theme: 'dark',
          position: 'bottom-right',
          locale: 'en-GB',
          onTokenRefresh: async () => {
            const refreshRes = await fetch('/api/support/token', {
              headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const data = await refreshRes.json();
            return data.jwt;
          }
        });
      } catch (err) {
        console.error('Widget init failed:', err);
      }
    }

    return () => {
      widgetRef.current?.destroy();
      script.remove();
    };
  }, []);

  return null;
}

export default SupportWidget;
```

E adicione `<SupportWidget />` no layout (so quando usuario esta logado).

### PASSO 6: Variaveis de Ambiente do TrackShare-Web

Adicione no `.env.local` do trackshare-web:
```
NEXT_PUBLIC_WIDGET_TENANT_ID=<tenantId-retornado-no-passo-1>
```

### PASSO 7: Servir o Widget JS

O widget SDK precisa ser acessivel via URL. Opcoes:

**Opcao A (simples)**: Copie o build do widget para a pasta `public/` do trackshare-web:
```bash
cd C:\ai-support-widget\widget
npm run build
cp dist/widget.js C:\trackshare-web\public\widget.js
```
E mude o `script.src` para `/widget.js`.

**Opcao B (proxy)**: Configure o Next.js do trackshare-web para servir de `localhost:3002/widget.js` (mais complexo).

### PASSO 8: Testar

1. Abra http://localhost:3000 (TrackShare)
2. Faca login com um usuario
3. O botao redondo do widget deve aparecer no canto inferior direito
4. Clique nele e envie uma mensagem como: "My upload failed with an error"
5. A IA deve responder com diagnostico baseado nos dados reais do usuario

### Resumo dos Arquivos a Criar/Modificar no TrackShare

| Arquivo | Acao | O que fazer |
|---------|------|------------|
| `C:\Trackshare\.env` | Modificar | Adicionar WIDGET_JWT_SECRET e WIDGET_TENANT_ID |
| `C:\Trackshare\src\env.ts` | Modificar | Registrar novas vars no Zod schema |
| `C:\Trackshare\src\modules\support\routes.ts` | Criar | Endpoint GET /api/support/token |
| `C:\Trackshare\src\modules\support\context.ts` | Criar | Endpoints GET /support/user-state, user-history, user-logs, business-rules |
| `C:\Trackshare\src\server.ts` | Modificar | Registrar novas rotas |
| `C:\trackshare-web\.env.local` | Modificar | Adicionar NEXT_PUBLIC_WIDGET_TENANT_ID |
| `C:\trackshare-web\src\components\support-widget.tsx` | Criar | Componente React que carrega o widget |
| `C:\trackshare-web\src\app\layout.tsx` | Modificar | Incluir <SupportWidget /> |

### Observacoes Importantes

- O JWT_SECRET do AI Support Widget e do TrackShare DEVEM ser identicos
- Os endpoints `/support/*` sao chamados pelo backend do AI Support Widget (nao pelo browser)
- O serviceToken ('trackshare-integration-token') e enviado nos headers das chamadas aos endpoints
- CORS do TrackShare pode precisar permitir `http://localhost:3002`
- Os endpoints de contexto NAO precisam de autenticacao do usuario (sao chamados servidor-a-servidor com o serviceToken)
