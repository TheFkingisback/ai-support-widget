import type { Article } from './model';
export const article: Article = {
  slug: "api-reference",
  title: "Referência da API",
  category: "CONSTRUA",
  summary: "Endpoints, corpos e respostas da plataforma.",
  keywords: "rest http cases messages sessões",
  sections: [
    {"id": "base", "title": "URL e autenticação", "text": ["Base: https://support-ai.pontes.uk. Use Content-Type: application/json nos corpos JSON. A credencial sik_ é exclusiva do emissor; as rotas de conversa usam Bearer com o JWT temporário."], "note": "Os caminhos de bootstrap/contexto do aplicativo são definidos pelo seu time. A plataforma recebe contexto push; não exige as quatro rotas pull do contrato antigo."},
    {"id": "session", "title": "POST /api/widget/sessions", "text": ["Autorização: Bearer <sik_>. HTTP 200 retorna {jwt, tenantKey, expiresIn:900}. O corpo contém a identidade revalidada pelo seu backend."], "code": "{ \"userId\": \"usr_exemplo\", \"userEmail\": \"\", \"userRoles\": [\"member\"], \"plan\": \"standard\" }", "language": "JSON"},
    {"id": "cases", "title": "Conversas e mensagens", "text": ["Todas as rotas abaixo verificam tenant e proprietário. Os identificadores são opacos. A criação bem-sucedida deve conter aiMessage e snapshot; confirme a resposta real na homologação."], "rows": [["Método / rota", "Corpo / resultado"], ["POST /api/cases", "{message, context, clientTurnId?, locale?} → {case, snapshot:{id}, aiMessage}"], ["GET /api/cases/:caseId", "→ {case, messages, snapshot}"], ["POST /api/cases/:caseId/messages", "{content, replyToMessageId?, clientTurnId?, locale?} → {message}"], ["POST /api/cases/:caseId/feedback", "{feedback:\"positive\"|\"negative\"} → {ok:true}"], ["POST /api/cases/:caseId/close", "{resolution:\"resolved\"|\"unresolved\", rating?:1…10} → {ok:true}"]], "note": "message/content: 1–5.000 caracteres. locale direciona o idioma e o alfabeto da resposta. Reutilize o mesmo clientTurnId (UUID) ao repetir o mesmo turno. Para fechar sem nota, envie {resolution:\"resolved\"}. replyToMessageId vincula uma confirmação à mensagem apresentada e é obrigatório para confirmar escrita."},
    {
      id: "product-ideas",
      title: "Product ideas",
      text: ["Submit ideas from the widget. Workspace members can view them by environment, and the owner can update their status."],
      rows: [
        ["Método / rota", "Corpo / resultado"],
        ["POST /api/cases/:caseId/suggestions", "{content} → HTTP 201 {id}"],
        ["GET /api/workspace/suggestions?env=production&before=idea_…", "→ {suggestions, next}"],
        ["PATCH /api/workspace/suggestions/:id", "{env, status} → {ok:true}"],
      ],
      code: '{ "env": "production", "status": "planned" }',
      language: "JSON",
    },
    {"id": "optional", "title": "Integrações opcionais", "text": ["POST /api/cases/:caseId/escalate recebe {reason?}. Escalonamento ou ações sem conector/executor podem retornar 501. Não anuncie chamado criado ou alteração concluída sem resultado verificável."], "links": [{"label": "Contrato de ações e MCP", "href": "/developers/mcp"}, {"label": "Contrato completo em Markdown", "href": "/integration-v3/GUIA.md"}]},
  ],
};
