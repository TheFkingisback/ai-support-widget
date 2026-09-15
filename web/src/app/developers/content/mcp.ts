import type { Article } from './model';
export const article: Article = {
  slug: "mcp",
  title: "MCP e ações",
  category: "CONSTRUA",
  summary: "Consultas por tenant e alterações com confirmação humana.",
  keywords: "conector ferramentas assinatura escrita confirmar",
  sections: [
    {"id": "reads", "title": "Conecte seu sistema por tenant", "text": ["O administrador configura endpoint HTTPS público, credencial dedicada e consultas permitidas em Integration settings → Tenant MCP. Sem cadastro, o chat usa somente o contexto. Não há conector global de fallback."], "bullets": ["Use MCP Streamable HTTP; um processo stdio local não é um endpoint remoto.", "A consulta deve estar na allowlist e declarar annotations.readOnlyHint: true.", "A credencial MCP é cifrada na plataforma e não é devolvida nas consultas de configuração."], "links": [{"label": "Configurar minha integração", "href": "/admin"}]},
    {"id": "principal", "title": "Identidade delegada", "text": ["A plataforma envia estes cabeçalhos ao seu conector. Valide a credencial e o tenant esperado; depois revalide a pessoa e cada recurso no seu backend. Não use argumentos escolhidos pela IA como autoridade."], "code": "Authorization: Bearer <credencial MCP dedicada>\nX-MCP-Tenant-Id: <tenant do projeto>\nX-MCP-User-Id: <pessoa autenticada>", "language": "HTTP", "links": [{"label": "Exemplo de autenticação MCP", "href": "/integration-v3/mcp-auth.mjs"}]},
    {"id": "actions", "title": "Alterações com confirmação humana", "text": ["A extensão 1.2 está implementada; escrita só fica disponível após assinatura, implementação do provedor, configuração e homologação. Os nomes das operações são configuração do tenant. As regras de negócio ficam no sistema cliente."], "rows": [["Etapa", "Responsabilidade"], ["prepare_action", "Provedor prepara uma proposta e resumo exato; sem efeito de negócio"], ["Apresentação", "Suporte mostra o resumo literal e guarda a versão"], ["confirmar / confirm", "Mensagem humana posterior, vinculada por replyToMessageId"], ["execute_action", "Prova RS256; provedor revalida estado e permissão e executa com idempotência"], ["get_action_status", "Após incerteza, consultar estado sem repetir a execução"]]},
    {"id": "safety", "title": "Uma proposta pendente por conversa", "text": ["Uma proposta nova cancela a anterior; confirmação atrasada não executa a substituída. O modelo não produz autorização. Outro texto exige nova proposta. Um resultado desconhecido bloqueia outra preparação até reconciliação."], "note": "SDK 0.2.2 envia o vínculo com a mensagem apresentada. O SDK 0.2.1 continua compatível com chat e leitura, mas não confirma escrita.", "links": [{"label": "Contrato de ações 1.2 completo", "href": "/actions-v1/CONTRATO.md"}]},
  ],
};
