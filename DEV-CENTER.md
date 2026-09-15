# Dev Center — decisão e entrega de produto

## 15/09/2026 — Documentação navegável do contrato v3
Anterior: /developers redirecionava todo o portal para um HTML estático; as páginas antigas continham descrições de assinatura e pull incompatíveis com o runtime atual.
Novo: portal público em /developers, com aliases /devcenter e /docs, visão geral, busca local por teclado, navegação móvel, guias em português, exemplos copiáveis, referência da API, MCP/ações, homologação, downloads genéricos e versões.
Motivo: permitir que um time integre e opere o produto com o contrato publicado, sem depender de mensagens ou pacotes individuais.
Impacto: somente documentação, navegação web e assets públicos. Sem mudança nos contratos da API, autenticação, credenciais, configuração MCP ou dados de clientes. A documentação é comum; configuração por tenant continua self-service.
O kit público contém placeholders, SDK fixado, exemplos e hashes; nenhum pacote privado ou identificador de cliente é publicado. Não recebe nem testa credenciais pelo browser.
Ações 1.2 aparecem como dependentes de assinatura, implementação remota e homologação. Não há indicador de saúde em tempo real ou afirmação de integração concluída para um cliente.
Implementação e build de produção: concluídos. Validação: 41 testes web, 2 testes dos adaptadores e homologação Chrome (desktop/celular, 10 seções, links, busca, teclado, clipboard e aliases) aprovados. Publicado em https://support-ai.pontes.uk/developers, release web 97441e4. Homologação pública aprovada: páginas, links, busca, teclado, clipboard, navegação móvel, aliases, ZIP/15 hashes e saúde da API HTTP 200. O manual HTML antigo redireciona para o portal; arquivos versionados anteriores são preservados.

## Publicação e recuperação
- Imagem web: `sha256:dc8e2595519005afb95ea61077785f0995030630a8682cde0331d6867f18a33f`.
- Release web: `/root/ai-support-releases/devcenter-97441e4`; ponteiro `current-web`. A imagem está fixada no override `docker-compose.devcenter.yml`.
- Backup: `/root/ops-backups/2026-09-15-devcenter-97441e4`; imagem anterior `ai-support-widget-web:before-devcenter-97441e4`.
- Uma publicação concorrente atualizou o backend durante o build. A ativação inicial foi interrompida pelo guard; a entrega web preservou o backend novo e seu ponteiro `current`. Futuras publicações devem preservar tanto a configuração atual do backend quanto esta release web.
- SDKs 0.2.1 e 0.2.2 preservados e conferidos na imagem candidata. `.gitattributes` evita conversão de novas linhas nos arquivos versionados com hash.
