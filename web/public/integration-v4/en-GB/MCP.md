# MCP per session

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
