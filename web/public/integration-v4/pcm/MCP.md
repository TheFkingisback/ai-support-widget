# MCP per session

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
