import type { Article } from './model';
export const article: Article = {
  slug: "changelog",
  title: "Versões e mudanças",
  category: "RECURSOS",
  summary: "O que está publicado e o que exige ativação.",
  keywords: "changelog migração v3 0.2.2 0.2.1",
  sections: [
    {"id":"v4","title":"Contrato v4 · SDK 0.3.0","text":["Servidores MCP por sessão"],"links":[{"label":"MCP e ações","href":"/developers/mcp"}]},
    {"id": "sdk024", "title": "SDK 0.2.4 · 23 novembro 2026", "text": ["O site e o SDK compartilham 21 idiomas, com variantes regionais, dois alfabetos sérvios e leitura da direita para a esquerda. O chat envia o idioma escolhido e o servidor prioriza documentos com a mesma variante. Starter, ZIP completo, manifesto e controlador são publicados juntos."], "links": [{"label": "Arquivos da versão atual", "href": "/developers/downloads"}]},
    {"id": "sdk023", "title": "SDK 0.2.3 · 23 novembro 2026", "text": ["Preserva o texto após falhas, deduplica a repetição de turnos e permite encerrar uma conversa sem nota."]},
    {"id": "sdk022", "title": "SDK 0.2.2 · 15 setembro 2026", "text": ["Vincula confirmações humanas à última mensagem assistente renderizada, inclusive após restauração. "]},
    {"id": "v3", "title": "Contrato v4 · sessões e contexto", "text": ["O backend usa credencial por tenant para emitir sessões de 15 minutos. Contexto push obrigatório, identidade validada, proteção de snapshots e MCP isolado substituem a integração legada."], "note": "A janela antiga de compatibilidade foi encerrada. Não assine JWTs com segredo compartilhado nem reative encaminhamento MCP global."},
    {"id": "compatibility", "title": "Como atualizar", "text": ["Fixe versão e hash do SDK. Preserve os identificadores já usados em produção. Uma atualização da plataforma não certifica o aplicativo: teste seu bootstrap, contexto, sessão, ferramentas e permissões."], "links": [{"label": "Baixar versão atual", "href": "/developers/downloads"}, {"label": "Roteiro de homologação", "href": "/developers/integration"}]},
  ],
};
