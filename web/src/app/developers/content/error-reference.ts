import type { Article } from './model';
export const article: Article = {
  slug: "error-reference",
  title: "Erros e diagnóstico",
  category: "PUBLIQUE",
  summary: "Entenda a falha e escolha a recuperação correta.",
  keywords: "401 403 404 429 timeout indisponível",
  sections: [
    {"id": "diagnose", "title": "Comece pela requisição que falhou", "text": ["Registre método, rota parametrizada, status, horário e requestId quando disponível. Nunca copie Authorization, JWT, credencial ou contexto bruto para um chamado."]},
    {"id": "status", "title": "HTTP e próxima ação", "text": ["Diferencie falha de autenticação, autorização, contrato e infraestrutura."], "rows": [["Status", "Diagnóstico / ação"], ["400", "Verifique corpo, campos obrigatórios, enums, datas e tamanho."], ["401 no emissor", "Credencial sik_ ausente, incorreta ou revogada."], ["401 na conversa", "Renove a sessão; confira identidade e migração de assinatura."], ["403", "Contexto incompatível ou acesso negado. Não force outra identidade."], ["404", "Conversa inexistente ou de outra pessoa. Não contorne o proprietário."], ["429", "Reduza volume; backoff com jitter e limite de tentativas."], ["500 / 502 / 503", "Investigue contexto, provedor e infraestrutura pelo requestId."], ["501", "Executor/conector indisponível. Use o canal humano real."]]},
    {"id": "limits", "title": "Limites conhecidos", "text": ["Limites atuais do emissor: 120 requisições/minuto por IP e 300/minuto por tenant. Criação de caso: 10/minuto por tenant/pessoa. Mensagens: 30/minuto por tenant/pessoa. Não emita uma sessão por render ou por mensagem."]},
    {"id": "retry", "title": "Recupere sem duplicar", "text": ["O SDK renova após 401 e repete uma vez; ele não oferece uma política geral automática para todo 429/5xx. Implemente tentativas limitadas onde forem seguras."], "note": "Um timeout de criação pode ocorrer depois de persistir o caso. Em ações de negócio, nunca repita execute_action automaticamente: consulte get_action_status.", "links": [{"label": "Revisar autenticação", "href": "/developers/authentication"}, {"label": "Revisar protocolo MCP", "href": "/developers/mcp"}]},
  ],
};
