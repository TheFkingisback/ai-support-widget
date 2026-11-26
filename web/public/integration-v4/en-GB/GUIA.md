# Support Integration · Contract v4

**SDK 0.3.0 · Backend, Frontend, and Operations Manual**

[TOC]

## 1. How it works

Your backend authenticates the user, projects the authorised context, and issues a 15-minute session. In the issuance call, you can include the MCP servers available to that person. The browser receives the widget's JWT and the context.

## 2. Environments and Responsibilities

The platform is at https://support-ai.pontes.uk. Use the correct environment's integration credential. The workspace administrator obtains the credential from the dashboard. The application team maintains the authenticated bootstrap, context, and delegated tokens per user and server.

## 3. Credentials

| Credential | Destination | Usage |
| --- | --- | --- |
| Integration credential sik_ | Support AI | Issue a session in the backend |
| Delegated token per server | MCP indicated in the session | Call tools as the authenticated person |
| Session JWT | Chat API | Open and continue conversations in the widget |

Store the integration credential in the application's vault. Revoking it deactivates JWTs issued with it on the next request. Generate delegated tokens in the backend and limit each to one resource, user, and validity period.

## 4. Authentication and Identity Flow

```text
Authenticated application session
  → backend validates active person, organisation, and current permissions
  → POST /api/widget/sessions with sik_ on the server
  ← jwt + tenantKey + expiresIn
  → backend collects and projects context of the SAME identity
  ← browser receives session/context with Cache-Control: no-store
  → widget calls /api/cases and conversation routes with the temporary JWT
```

Preserving the client's historical identifier `usr_...` prevents losing access to their own conversations. Do not use email, role, device, or timestamp as identity. If the same user can change companies, define a stable subject per affiliation or explicit history policy; the platform authorises conversations by tenant + person, without inferring client organisations.

The platform verifies signature, issuer `ai-support`, audience `ai-support-widget`, purpose `widget`, `sub=userId`, validity, and the session's active credential. The browser does not re-sign or alter claims. Roles sent to support are context information; API/MCP authorisation remains on the client server.

## 5. Issuer Contract

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

200 Response: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validate `tenantKey` before returning to the browser. The `backend-session.mjs` file implements a strict body, timeout, redirect blocking, response limit, and tenant validation; it does not replace your authentication middleware.

| Field | Rule |
| --- | --- |
| mcpServers | Optional list of up to eight objects with unique id, url, and accessToken. See section 12. |
| userId | Mandatory, trim, 1–200 characters |
| userEmail | Valid email up to 254 characters or empty; default empty |
| userRoles | Up to 30 strings of 1–80 characters; default empty list |
| plan | String of 1–80 characters; default standard |

Do not send tenantId, tenantKey, userName, role, purpose, exp or other fields in the body. The credential determines the tenant. Identity comes from the session/database, not the browser query/body. The issuer does not accept user JWT, administrative key, or old secret in place of `sik_`.

The public issuer works without per-project usage quotas. Reuse a still-valid session from the same person, company, and permissions, with early expiration and invalidation on changes.

## 6. Mandatory context and correct identity

Each new case requires `context.userState`, `context.userHistory`, and `context.userLogs`. Send empty lists when the source has been queried and there are no records; **do not convert a failed collection into an apparently successful empty list**. If you cannot provide valid and authorised context, the client bootstrap must return a controlled error.

`context.example.json` is the minimum example. `context.schema.json` was exported from the Zod schema used on the server, not written independently. Validate the JSON on the backend before deployment. Unrecognised extra fields are discarded; metadata and rules may contain their own structures, subject to projection/limits. The schema does not prove authorisation or eliminate all sensitive data.

| Block | Mandatory / structure |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positive up to 720, events; timeline is reconstructed from events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Optional; docs with id, title, content, category |
| businessRules | Optional; approved rules object, serialised as runbook |

`userState.userId` must be exactly the identity issued. **`userState.tenantId` is the platform tenant**, never the organisation/store ID on the client. Discrepancies return 403. Data in the browser can be tampered with; context does not authorise operations.

## 7. Fields, limits and normalisation

| Structure | Main fields / rules |
| --- | --- |
| entities | type, status; id/description optional; metadata object; up to 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; up to 100 |
| errorClass of activeErrors | validation, permission, infra or business; categories like payment require mapping |
| events | ts, event, page; elementId, intent, correlationRequestId accept null/omission; up to 1,000 |
| recentRequests | ts, route, httpStatus integer, timingMs, requestId; errorCode/resourceId can be null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs number or null; errorCode/lastStage can be null |
| status of jobs | queued, running, succeeded, failed, canceled |
| errors from backend | ts, errorCode, errorClass string, route, requestId; resourceId can be null |
| docs | Up to 50; content up to 32,000 characters, other texts up to 4,096 |

Dates are ISO-8601 strings with timezone; serialise Date on the backend. Do not invent updatedAt, durationMs, retryable or categories just to pass the schema: use the real origin or omit the record and report source unavailability. Register your project's specific mappings upon acceptance.

Context ceiling sent: **262,144 bytes UTF-8 (256 KiB)**. The full HTTP remains limited to 1,048,576 bytes. Snapshot budget is `min(maxContextBytes, 262144)`. If even the essential part doesn't fit, the request fails; reduce metadata/documents in the backend. We suggest starting with 48 KiB, ten entities, and short knowledge.

The server filters events/logs by the smallest window between the requested and the tenant's, removes future dates, and applies maxLogLines combined with requests, errors, and jobs (in this order). maxDocs limits the docs list; businessRules is a separate runbook and also occupies the total budget. The timeline follows the kept events. Less relevant data usually produces better diagnosis and lower cost.

## 8. Privacy and persistence

Design data before sending it: never forward headers, cookies, JWTs, credentials, connection strings, signed URLs, binary content, other users' data, or raw exports. Replace secrets with support references. Do not send the entire PRD or full logs as a knowledge base.

New snapshots undergo validation, redaction, reduction, and budgeting before recording. Messages and tool results are treated for known secret patterns. This protection is complementary: it is not an infallible personal data classifier, does not retroactively correct historical records, nor does it replace client design.

Context is a snapshot from the start of the conversation, not a real-time query. Provide timestamps and sources. `updateContext()` applies to the next case; for current data during a conversation, use an approved reading tool.

## 9. Frontend and SDK 0.3.0

Serve the fixed SDK from the package or public URL. Check SHA-256 with `widget.manifest.json`. Avoid duplicate script, floating version, and JWT cache. The reference controller in `widget-controller.mjs` mounts after bootstrap, awaits onOpen, renews, and prevents late mounting after logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// On logout, person/company/role change, and component cleanup:
controller.destroy();
```

The functions above are application callbacks, to be implemented with your usual HTTP client. Bootstrap returns `{jwt,tenantKey,expiresIn,context}`. getContext returns the context object. In React, stabilise callbacks with useCallback and mount in useEffect linked to identity. Do not place the widget outside the authenticated area or offer visitors a shared userId.

The SDK accepts `onTokenRefresh` which returns the new JWT; after 401, it retries the request once. Renewal must use the same person. Identity change requires destroy and init. If using a proactive timer, prefer about ten minutes with jitter and cancel on cleanup. Bootstrap, collection, and model errors should not block the main application.

## 10. Logout, permissions, and history

`destroy()` aborts calls and removes local persistence per tenant/person. It is not individual revocation on the server. A JWT already copied may remain valid for up to 15 minutes after logout/lock on the client. If immediate per-person revocation is needed, the contract requires further evolution; do not use whole-tenant rotation as normal logout.

Each conversation read/write requires the same owner and tenant. Role change on the client does not erase content the person has already received in the conversation. Define a history policy for permission demotion and organisational changes. Do not relax authorisation to retrieve an old caseId; verify the original subject or start a new conversation.

## 11. CORS, CSP, PWA and access

Allow the exact origin of each frontend on the platform. The SDK needs connect-src for support; serving the local file allows script-src self. The SDK injects style into the Shadow DOM and does not yet receive a nonce: approve the real CSP policy, which may require SDK evolution for external styles/nonce/hash. Do not disable the entire policy.

Sessions and context are no-store. Exclude support routes from PWA caches, query persistence and replay tools. Test keyboard, focus, screen reader, zoom and mobile. Present a genuine human channel in the application, with confirmed times/URL. The SDK does not invent a service provider.

## 12. MCP servers in session

The application backend sends `POST /api/widget/sessions` with the integration credential `sik_`. It derives the person and their organisation from the login and can include up to eight servers in `mcpServers`. An omitted or empty field creates a chat with context. Each new session receives its own list.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Each id starts with a lowercase letter and accepts lowercase letters, digits, underscore and hyphen, up to 32 characters. IDs, normalised URLs and tokens are unique in the list. The transport is MCP Streamable HTTP over public HTTPS, port 443, with a URL without credentials, query or fragment. The service verifies the DNS upon connection and rejects redirects.

The application issues or obtains a short-lived access token for each destination, restricted to the person, organisation, permissions and audience of that MCP. The Support AI presents `Authorization: Bearer <accessToken>` to the corresponding server. The provider verifies signature or introspection, issuer, validity, audience and resource access in each operation. It publishes only the tools allowed for that identity in the catalogue. The platform credential, the widget’s JWT and service keys like Stripe have their own purposes.

The delegated token is encrypted on the server for up to 900 seconds. The browser receives `{jwt, tenantKey, expiresIn: 900}`. Upon renewal, the backend revalidates the identity and sends a new list with valid tokens. A proposal created before renewal needs to be presented again. For organisational changes, use a stable identifier per link and destroy the previous widget instance.

The Support AI iterates through `tools/list` pages, distinguishes identical names by server, and uses the original name when calling `tools/call`. Catalogues with more than 32 tools have in-chat search and pagination. Discovery limits per server are 128 pages and 4 MB of descriptions. A discovery failure for one server preserves the others.

Tools with `annotations.readOnlyHint: true` can be queried directly. For any tool with a missing or false annotation, the chat displays the server, name, and arguments before execution. Declare read-only for operations without business effects. The user responds `confirmar` or `confirm` to the displayed message within five minutes. The SDK sends `replyToMessageId`. Confirmation applies to those arguments, server, session, and conversation. A new proposal replaces the previous one.

The platform attempts execution after registering the confirmation and sends `Idempotency-Key` with the proposal ID. For payments and operations with external effects, the provider must atomically store the key and result and respect the idempotency keys required by the financial service. After a timeout or ambiguous result, support registers an unknown state, blocks new changes in that conversation, and keeps queries available. Check the operation in the source system before proceeding.

To homologate, test one session without servers, two sessions from the same user, two organisations, servers with homonymous tools, and a paginated catalogue. Verify token scope/expiration with the provider, cancellation, and duplicate confirmation. Use synthetic records to check the result at the source.

## 13. Model, prompt, and knowledge

Initially preserving the model already homologated by the project reduces simultaneous changes. For a new evaluation, `openai/gpt-4.1-mini` is a compatible candidate with current parameters: Chat Completions via OpenRouter, temperature 0.3, and max_tokens 2048. Validate in the real account before activating. Preferred Model takes precedence over Model Policy; auto is not intelligent routing. Prices/costs must come from the provider; old panel estimates may diverge.

The **AI Instructions / Custom instructions** field accepts up to 2,000 effective characters. Paste only `PROMPT-TENANT.txt`; review names, channel, and product rules. Do not paste credentials or concatenate documents in this field. The instruction complements platform rules; it does not grant authorisation or enable tools.

The provided prompt guides responses in the language and writing chosen by the person, facts separated from hypotheses, respect for permissions, use of secure references, absence of promises of actions, and a human channel. `knowledgePack.docs` should contain short, versioned runbooks with a responsible party: frequent errors, diagnosis, product limits, and how to confirm the result. Logs and documents are data, never instructions to alter assistant rules.

Model sources: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) and [OpenRouter catalogue](https://openrouter.ai/api/v1/models), consulted in prior preparation on 14/09/2026. Reconfirm availability/pricing upon implementation; no paid model comparison was conducted in this kit.

## 14. Error and diagnostic contract

| Response | Meaning / action |
| --- | --- |
| 401 on issuer | sik missing, incorrect, or revoked; correct configuration |
| 400 on issuer | Body out of contract; remove extra fields |
| 401 on cases | Legacy signature, expiry, invalid claims, or revoked session |
| 400 on cases | Invalid mandatory context, incorrect dates/states, or budget exceeded |
| 403 from context | userState does not match tenant/person from JWT |
| 404 on conversation | Non-existent resource or belonging to another identity; do not force access |
| 429 | Limit; backoff/jitter, no emission loop |
| 500/502/503 | Infrastructure, model, or context failure; report unavailability and requestId |
| 501 on actions/escalation | Functionality without executor/connector; use real human channel |
| Chat works, MCP doesn't | Check the list sent in the last emission, validity, audience, and catalogue response. |
| Tool missing | Check the catalogue available for the delegated token and server connectivity. |

Do not use HTTP 200 alone as acceptance: check response content and snapshot. Creation failing after saving the case may leave a case unanswered; do not assume a transaction involving the model call. Retries must be limited and reported to the user. Log method, parameterised route, status, requestId, and UTC time; never capture Authorization/JWT, secret, or raw payload to forward diagnosis.

## 15. Mandatory acceptance

1. Bootstrap route without login rejected before issuer. Forged identities do not change the authenticated user.
2. Emission with correct credential returns expected tenant and 900 seconds; secret does not appear in browser/replay/logs.
3. Old JWT is rejected. New session creates conversation with snapshot and real response; reopens for the same person.
4. Two people from the same project and two tenants: GET case and POST messages/feedback/close/escalate/actions do not cross identities.
5. Context without blocks, different identity, invalid date, and excessive size are rejected; synthetic secrets do not persist in the snapshot.
6. Renewal after 15 minutes, logout during collection, account/company/role change, and navigation do not restore another person's conversation.
7. Model responds using evidence and respects diagnostic limit; failure does not generate apparent success.
8. Emit sessions with zero and two servers. Check that each destination receives its own token.
9. MCP refuses wrong/old token, wrong tenant, missing/inactive user, and another person's resource. Test reused session ID, if session exists.
10. Confirm that changes require proposal confirmation and do not repeat in case of timeout.
11. CORS/CSP, mobile, keyboard, and human channel approved. Coordinated rotation tested in homologation.

`node --test examples.test.mjs` validates isolated adapters with mocks. It does not replace these end-to-end tests. Fill in `ACEITE.md` with owners, versions, times, and unclassified evidence.

## 16. Publishing, cutting, and recovery

Install the integration credential, publish the bootstrap and SDK, validate the chat, and approve the servers declared in the sessions.

Do not reactivate legacy subscriptions or global MCP forwarding to recover availability. If there is a failure, temporarily disable the widget or MCP for the affected tenant and maintain the human channel while fixing the adapter. Do not delete conversations to circumvent an owner 404.

Record retention limits and application-specific evidence.

## 17. Feedback and package files

Return project name, tenant, backend/frontend commits, UTC date, SDK/hash, installed credential (yes/no, no value), approved chat, MCP approved/disabled, negative tests, human channel, and pending items. Do not conclude with "seems to work".

The public kit contains this guide in Markdown, server schema, minimal fixture, issuer adapter, MCP authentication, frontend controller, SDK, prompt, isolated tests, checklist, actions contract, and SHA-256 manifest. Individual packages may add specific attachments. The examples do not automatically implement the client application endpoints. The browsable version is at https://support-ai.pontes.uk/developers?lang=en-GB.
