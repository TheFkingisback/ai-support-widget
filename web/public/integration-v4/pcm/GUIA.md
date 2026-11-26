# Integrate support · contract v4

**SDK 0.3.0 · Backend, frontend, and operation manual**

[TOC]

## 1. How e dey work

Your backend go authenticate di user, project di authorized context, and issue one 15-minute session. For di issue call, e fit include di available MCP servers for dat person. Di browser go receive di widget JWT and di context.

## 2. Environments and who dey responsible

Di platform dey for https://support-ai.pontes.uk. Use di correct environment integration credential. Di workspace admin go get di credential for di dashboard. Di app team go maintain di authenticated bootstrap, di context, and di delegated tokens per user and server.

## 3. Credentials

| Credential | Destination | Use |
| --- | --- | --- |
| Integration credential sik_ | Support AI | Issue one session for di backend |
| Delegated token per server | MCP wey dem indicate for di session | Call tools as di authenticated person |
| JWT of di session | API of di chat | Open and continue conversations for di widget |

Keep di integration credential for di app vault. If you revoke am, e go deactivate di JWTs wey dem issue with am for di next request. Generate di delegated tokens for di backend and limit each one to one resource, user, and validity period.

## 4. Authentication and identity flow

```text
Authenticated app session
  → backend go validate active person, organization, and current permissions
  → POST /api/widget/sessions with sik_ for di server
  ← jwt + tenantKey + expiresIn
  → backend go collect and project context of di SAME identity
  ← browser go receive session/context with Cache-Control: no-store
  → widget go call /api/cases and conversation routes with di temporary JWT
```

Preserving di client historical identifier `usr_...` go prevent losing access to dem own conversations. No use email, role, device, or timestamp as identity. If di same user fit change company, define stable subject per link or explicit history policy; di platform go authorize conversations by tenant + person, without inferring client organizations.

Di platform go verify signature, issuer `ai-support`, audience `ai-support-widget`, purpose `widget`, `sub=userId`, validity, and di active session credential. Di browser no go re-sign or alter claims. Roles wey dem send to support na context information; API/MCP authorization go continue for di client server.

## 5. Issuer contract

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Response 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validate `tenantKey` before you return am to di browser. Di `backend-session.mjs` file go implement strict body, timeout, redirect blocking, response limit, and tenant validation; e no go replace your authentication middleware.

| Field | Rule |
| --- | --- |
| mcpServers | Optional list of up to eight objects with unique id, url, and accessToken. See section 12. |
| userId | Required, trim, 1–200 characters |
| userEmail | Valid email up to 254 characters or empty; default empty |
| userRoles | Up to 30 strings of 1–80 characters; default empty list |
| plan | String of 1–80 characters; default standard |

No send tenantId, tenantKey, userName, role, purpose, exp or other fields for inside. Credential go determine tenant. Identity go come from session/bank, no from browser query/body. Issuer no go accept user JWT, admin key or old secret instead of `sik_`.

Public issuer dey work without use quotas for each project. Reuse session wey still dey valid from di same person, company and permissions, with early expiration and invalidation when changes happen.

## 6. Compulsory context and correct identity

Every new case need `context.userState`, `context.userHistory` and `context.userLogs`. Send empty lists if dem don query di source and no records dey; **no change collection wey fail to empty list wey look like success**. If you no fit provide valid and authorized context, client bootstrap must return controlled error.

`context.example.json` na di minimum example. `context.schema.json` dem export am from schema Zod wey dem use for server, dem no write am separately. Validate di JSON for backend before deploy. Extra fields wey dem no recognize, dem go discard am; metadata and rules fit get dia own structures, subject to projection/limits. Schema no dey prove authorization or remove all sensitive data.

| Block | Compulsory / structure |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positive up to 720, events; timeline dem go rebuild am from events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Optional; docs with id, title, content, category |
| businessRules | Optional; approved rules object, serialized as runbook |

`userState.userId` must be di exact identity wey dem issue. **`userState.tenantId` na di platform tenant**, never di organization/store ID for di client. Discrepancies go return 403. Data for browser fit dey tampered with; context no dey authorize operations.

## 7. Fields, limits and normalization

| Structure | Main fields / rules |
| --- | --- |
| entities | type, status; id/description optional; metadata object; up to 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; up to 100 |
| errorClass of activeErrors | validation, permission, infra or business; categories like payment need mapping |
| events | ts, event, page; elementId, intent, correlationRequestId fit null/omission; up to 1,000 |
| recentRequests | ts, route, httpStatus integer, timingMs, requestId; errorCode/resourceId fit be null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs number or null; errorCode/lastStage fit be null |
| status of jobs | queued, running, succeeded, failed, canceled |
| errors from backend | ts, errorCode, errorClass string, route, requestId; resourceId fit be null |
| docs | Up to 50; content up to 32,000 characters, other texts up to 4,096 |

Dates na ISO-8601 strings with timezone; serialize Date for backend. No invent updatedAt, durationMs, retryable or categories just to pass schema: use di real source or omit di record and report say di source no dey available. Record your project specific mappings for acceptance.

Context wey dem send don reach: **262.144 bytes UTF-8 (256 KiB)**. Di HTTP wey complete still get limit of 1.048.576 bytes. Snapshot budget na `min(maxContextBytes, 262144)`. If di main part no even fit, di request go fail; make una reduce metadata/documents for di backend. We suggest make una start with 48 KiB, ten entities and short knowledge.

Server go filter events/logs by di smallest window between di one wey dem request and di tenant own, e go remove future dates and apply maxLogLines wey dem combine with requests, errors and jobs (for dis order). maxDocs go limit di docs list; businessRules na separate runbook and e still dey use di total budget. Di timeline go follow di events wey dem keep. If di data wey relevant no too much, e go usually give better diagnosis and cost go reduce.

## 8. Privacy and how e dey last

Plan di data before una send am: make una no ever forward headers, cookies, JWTs, credentials, connection strings, signed URLs, binary content, data from other users or raw exports. Replace secrets with support references. Make una no send di whole PRD or complete logs as knowledge base.

New snapshots go pass through validation, redaction, reduction and budget before dem save am. Messages and results from tools get treatment for known secret patterns. Dis protection na extra: e no be perfect classifier for personal data, e no correct historical records wey don pass and e no replace wetin di client plan.

Context na snapshot of di beginning of di conversation, e no be real-time query. Give timestamps and sources. `updateContext()` go work for di next case; for current data during a conversation, use approved reading tool.

## 9. Frontend and SDK 0.3.0

Serve di SDK wey dem fix from di package or di public URL. Check SHA-256 with `widget.manifest.json`. Avoid duplicated script, floating version and JWT cache. Di reference controller for `widget-controller.mjs` go mount after bootstrap, wait for onOpen, renew and prevent late mounting after logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// When you logout, change person/company/role and clean up di component:
controller.destroy();
```

Di functions wey dey up na application callbacks, wey una go implement with una usual HTTP client. Bootstrap go return `{jwt,tenantKey,expiresIn,context}`. getContext go return di context object. For React, stabilize callbacks with useCallback and mount for useEffect wey dem link to di identity. Make una no put di widget outside di authenticated area or offer visitors with a shared userId.

Di SDK go accept `onTokenRefresh` wey go return di new JWT; after 401, e go repeat di request once. Renewal need to use di same person. If identity change, e go need destroy and init. If una use proactive timer, prefer around ten minutes with jitter and cancel am for cleanup. Errors for bootstrap, collection and model no suppose to block di main application.

## 10. Logout, permissions and history

`destroy()` go cancel calls and comot local persistence by tenant/person. E no be individual revocation for server. One JWT wey don copy fit still dey valid for up to 15 minutes after logout/lock for client. If you need immediate revocation by person, the contract need more work; no use full tenant rotation as normal logout.

Every conversation read/write needs the same owner and tenant. Role change for client no dey delete content wey person don already receive for conversation. Set history policy for permission demotion and organization changes. No relax authorization to retrieve old caseId; verify original subject or start new conversation.

## 11. CORS, CSP, PWA and access

Allow the exact origin of each frontend on the platform. The SDK needs connect-src for support; serving the local file allows script-src self. The SDK injects style into Shadow DOM and still no dey receive nonce: approve the real CSP policy, e fit need SDK evolution for external styles/nonce/hash. No turn off the whole policy.

Sessions and context na no-store. Exclude support routes from PWA caches, query persistence and replay tools. Test keyboard, focus, screen reader, zoom and mobile. Present real human channel for the app, with confirmed time/URL. The SDK no dey invent a service provider.

## 12. MCP servers for session

The app backend sends `POST /api/widget/sessions` with the integration credential `sik_`. E dey derive the person and their organization from login and fit include up to eight servers for `mcpServers`. Omitted or empty field creates a chat with context. Every new session gets its own list.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Every id starts with a lowercase letter and accepts lowercase letters, digits, underscore and hyphen, up to 32 characters. IDs, normalized URLs and tokens na unique for the list. The transport na MCP Streamable HTTP over public HTTPS, port 443, with URL no get credentials, query or fragment. The service checks DNS when connecting and rejects redirects.

The app issues or gets a short access token for each destination, restricted to the person, organization, permissions and audience of that MCP. The Support AI presents `Authorization: Bearer <accessToken>` to the corresponding server. The provider verifies signature or introspection, issuer, validity, audience and resource access for each operation. E dey publish only the tools allowed for that identity for the catalog. The platform credential, the widget JWT and service keys like Stripe get their own purposes.

The delegated token dey encrypted for server for up to 900 seconds. The browser receives `{jwt, tenantKey, expiresIn: 900}`. When renewing, the backend revalidates identity and sends a new list with valid tokens. A proposal created before renewal needs to be presented again. For organization change, use a stable identifier per link and destroy the previous widget instance.

Di Support AI go through di pages wey `tools/list` get, e go separate names wey be di same by server, and e go use di original name when e dey call `tools/call`. Catalogs wey get pass 32 tools get search and pagination inside di chat. Di discovery limits for each server na 128 pages and 4 MB of descriptions. If one server no discover well, di others go still dey fine.

Tools wey get `annotations.readOnlyHint: true` fit ask directly. For any tool wey no get di annotation or di annotation na lie, di chat go show server, name, and arguments before e run am. Declare read-only for operations wey no get business effects. Di user go reply `confirmar` or `confirm` to di message wey show within five minutes. Di SDK go send `replyToMessageId`. Di confirmation go cover those arguments, server, session, and conversation. A new proposal go replace di old one.

Di platform go try run am after e don record di confirmation and e go send `Idempotency-Key` with di proposal ID. For payments and operations wey get external effects, di provider must save di key and di result atomically and respect di idempotency keys wey di financial service need. After timeout or if di result no clear, di support go record unknown state, block new changes for dat conversation and keep queries available. Check di operation for di original system before you continue.

To homologate, test one session wey no get servers, two sessions for di same user, two organizations, servers wey get tools wey get di same name, and a paginated catalog. Check di scope/expiration of di tokens for di provider, cancellation and duplicate confirmation. Use synthetic records to check di result for di source.

## 13. Model, prompt and knowledge

To first keep di model wey di project don homologate go reduce too many changes at once. For a new evaluation, `openai/gpt-4.1-mini` fit work with di current parameters: Chat Completions through OpenRouter, temperature 0.3 and max_tokens 2048. Validate for di real account before you activate am. Preferred Model go override Model Policy; auto no be smart routing. Prices/costs must come from di provider; old estimates from di panel fit dey different.

Di field **AI Instructions / Custom instructions** fit take up to 2,000 actual characters. Paste only `PROMPT-TENANT.txt`; review names, channel and product rules. No paste credentials or join documents for dis field. Di instruction na to support di platform rules; e no give authorization or enable tools.

Di prompt wey dem give go guide answers for di language and writing style wey di person choose, facts separate from assumptions, respect for permissions, use of secure references, no promises of actions and human channel. `knowledgePack.docs` must get short, versioned runbooks with who dey in charge: frequent errors, diagnosis, product limits and how to confirm result. Logs and documents na data, dem no be instructions to change di assistant rules.

Model Sources: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) and [OpenRouter catalog](https://openrouter.ai/api/v1/models), wey dem check before for 14/09/2026. Make una reconfirm if dem still get am/how much e be when una wan use am; dem no pay for any model comparison for dis kit.

## 14. Error and Diagnosis Contract

| Response | Meaning / Action |
| --- | --- |
| 401 for issuer | sik no dey, e wrong or dem don cancel am; make una correct settings |
| 400 for issuer | Body no follow contract; make una comot extra fields |
| 401 for cases | Old signature, don expire, claims no valid or session don cancel |
| 400 for cases | Required context no valid, dates/states wrong or budget don pass |
| 403 from context | userState no match tenant/person for JWT |
| 404 for conversation | Resource no dey or e belong to another person; make una no force access |
| 429 | Rate limit; backoff/jitter, no issue loop |
| 500/502/503 | Infrastructure, model or context fail; make una report say e no dey available and requestId |
| 501 for actions/escalation | Functionality no get executor/connector; make una use real human channel |
| Chat dey work, MCP no dey work | Check di list wey dem send for di last issue, validity, audience and catalog response. |
| Tool no dey | Check di catalog wey dey available for di delegated token and server connectivity. |

No just use HTTP 200 as accept: check di response content and snapshot. If creation fail after e don save di case, e fit leave di case without response; no assume say transaction involve di model call. Retries must be limited and dem must tell di user. Record method, parameterized route, status, requestId and time UTC; never capture Authorization/JWT, secret or raw payload to forward diagnosis.

## 15. Required Acceptance

1. Bootstrap route without login rejected before issuer. Fake identities no change di authenticated user.
2. Issue with correct credential return di expected tenant and 900 seconds; secret no show for browser/replay/logs.
3. Old JWT dem reject am. New session create conversation with snapshot and real response; reopens for di same person.
4. Two people from di same project and two tenants: GET case and POST messages/feedback/close/escalate/actions no cross identities.
5. Context without blocks, different identity, invalid date and excessive size dem reject am; synthetic secrets no dey persist for snapshot.
6. Renewal after 15 minutes, logout during collection, account/company/role change and navigation no restore another person's conversation.
7. Model respond using evidence and respect diagnostic limit; failure no generate apparent success.
8. Issue sessions with zero and two servers. Confirm say each destination receive its own token.
9. MCP refuse wrong/old token, wrong tenant, missing/inactive user and another person's resource. Test reused session ID, if session dey.
10. Confirm say changes need proposal confirmation and dem no repeat for timeout.
11. CORS/CSP, mobile, keyboard and human channel approved. Coordinated rotation tested for approval.

`node --test examples.test.mjs` dey check isolated adapters wit mocks. E no go replace dem end-to-end tests. Fill `ACEITE.md` wit responsible pipo, versions, times, and evidence wey no get secret.

## 16. Publish, Cut, and Recover

Install di integration credential, publish di bootstrap and di SDK, validate di chat and approve di servers wey dem declare for di sessions.

No reactivate old subscriptions or global MCP forwarding to get availability back. If e fail, temporarily disable di widget or MCP of di affected tenant and keep di human channel while you fix di adapter. No delete conversations to bypass a 404 owner error.

Record di retention limits and di specific evidence for your application.

## 17. Feedback and Package Files

Return project name, tenant, backend/frontend commits, UTC date, SDK/hash, installed credential (yes/no, no value), approved chat, MCP approved/off, negative tests, human channel and pending issues. No conclude with “e look like e dey work”.

Di public kit get dis guide for Markdown, server schema, minimum fixture, issuer adapter, MCP authentication, frontend controller, SDK, prompt, isolated tests, checklist, actions contract and SHA-256 manifest. Individual packages fit add specific attachments. Di examples no automatically implement di client application endpoints. Di browsable version dey for https://support-ai.pontes.uk/developers?lang=pcm.
