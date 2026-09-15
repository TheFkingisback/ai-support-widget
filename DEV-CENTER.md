# Dev Center — decisão e entrega de produto

## 15/09/2026 — Documentação navegável do contrato v3
Anterior: /developers redirecionava todo o portal para um HTML estático; as páginas antigas continham descrições de assinatura e pull incompatíveis com o runtime atual.
Novo: portal público em /developers, com aliases /devcenter e /docs, visão geral, busca local por teclado, navegação móvel, guias em português, exemplos copiáveis, referência da API, MCP/ações, homologação, downloads genéricos e versões.
Motivo: permitir que um time integre e opere o produto com o contrato publicado, sem depender de mensagens ou pacotes individuais.
Impacto: somente documentação, navegação web e assets públicos. Sem mudança nos contratos da API, autenticação, credenciais, configuração MCP ou dados de clientes. A documentação é comum; configuração por tenant continua self-service.
O kit público contém placeholders, SDK fixado, exemplos e hashes; nenhum pacote privado ou identificador de cliente é publicado. Não recebe nem testa credenciais pelo browser.
Ações 1.2 aparecem como dependentes de assinatura, implementação remota e homologação. Não há indicador de saúde em tempo real ou afirmação de integração concluída para um cliente.
Implementação e build de produção: concluídos. Validação: 41 testes web, 2 testes dos adaptadores e homologação Chrome (desktop/celular, 10 seções, links, busca, teclado, clipboard e aliases) aprovados. Publicação em andamento. O manual HTML antigo redireciona para o portal; arquivos versionados anteriores são preservados.
