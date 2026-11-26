import type { Article } from './model';
export const article: Article = {
  "slug": "mcp",
  "title": "MCP e ações",
  "category": "CONSTRUA",
  "summary": "Servidores MCP por sessão",
  "keywords": "mcpServers tools/list tools/call Bearer readOnlyHint Idempotency-Key",
  "sections": [
    {
      "id": "session",
      "title": "POST /api/widget/sessions",
      "text": [
        "O backend pode enviar até oito servidores em mcpServers. Omitir a lista abre o chat apenas com contexto."
      ],
      "code": "{\n  \"userId\": \"usr_ana\",\n  \"mcpServers\": [\n    {\n      \"id\": \"billing\",\n      \"url\": \"https://billing.example/mcp\",\n      \"accessToken\": \"TOKEN_BILLING\"\n    },\n    {\n      \"id\": \"crm\",\n      \"url\": \"https://crm.example/mcp\",\n      \"accessToken\": \"TOKEN_CRM\"\n    }\n  ]\n}",
      "language": "JSON"
    },
    {
      "id": "identity",
      "title": "Authorization: Bearer",
      "text": [
        "Use um token curto por servidor e por pessoa. O provedor verifica audiência, validade, organização e permissões em cada chamada. Renove os tokens pelo backend."
      ],
      "links": [
        {
          "label": "MCP.md",
          "href": "/integration-v4/MCP.md"
        }
      ]
    },
    {
      "id": "discovery",
      "title": "tools/list → tools/call",
      "text": [
        "O chat descobre o catálogo paginado de cada servidor. Consultas com readOnlyHint: true podem executar diretamente."
      ]
    },
    {
      "id": "actions",
      "title": "replyToMessageId",
      "text": [
        "As demais ferramentas exigem confirmação dos argumentos na mesma sessão em até cinco minutos. O provedor recebe Idempotency-Key. Se o resultado for desconhecido, confira a operação na origem."
      ]
    }
  ]
};
