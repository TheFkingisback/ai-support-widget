import type { Article } from './model';
export const article: Article = {
  slug: "integration",
  title: "Homologação",
  category: "PUBLIQUE",
  summary: "Um roteiro verificável para liberar a integração.",
  keywords: "checklist produção cors csp testes aceite",
  sections: [
    {"id": "backend", "title": "01 · Identidade e backend", "text": ["Use duas pessoas e duas organizações sintéticas. Registre resultado e evidência de cada cenário."], "bullets": ["Sem login: rejeitar antes de chamar o emissor.", "Identidade forjada no body/query: não altera o principal.", "Papel revogado e recurso de outra pessoa: acesso negado.", "Credencial no ambiente privado; nenhum segredo no browser ou logs."]},
    {"id": "chat", "title": "02 · Contexto e resposta", "text": ["Uma interface aberta não comprova uma integração pronta."], "bullets": ["Emissão correta: tenant esperado e validade de 900 segundos.", "Contexto válido, snapshot correspondente e resposta real do modelo.", "Contexto inválido, ausente ou excessivo: erro explícito.", "Falha do modelo: não apresentar sucesso."]},
    {"id": "browser", "title": "03 · Navegador e sessão", "text": ["Homologue o ciclo de vida na origem que será usada pelos clientes."], "bullets": ["Expiração/401: renovar com a mesma identidade e repetir uma vez.", "Logout durante coleta: não montar o widget depois.", "Troca de pessoa/organização/papel: destruir a instância anterior.", "Conferir CORS, CSP, cache PWA, celular e teclado."]},
    {"id": "mcp", "title": "04 · MCP e ações opcionais", "text": ["O aceite do chat é separado do aceite do MCP. Uma consulta deve devolver o dado sintético esperado e bloquear recurso alheio. Ferramenta fora da allowlist, credencial inválida, timeout e isError não podem virar sucesso."], "note": "Para escrita, acrescentar substituição, confirmação atrasada, expiração, concorrência, revogação de permissão, reinício e idempotência."},
    {"id": "release", "title": "05 · Publique com evidências", "text": ["Registrar versão/hash do SDK, commits do aplicativo, origens, horário UTC, responsáveis, resultados negativos, canal humano real e pendências. Em incidente, desligue o widget ou MCP afetado; não restaure assinaturas legadas."], "links": [{"label": "Baixar formulário de aceite", "href": "/integration-v3/ACEITE.md"}]},
  ],
};
