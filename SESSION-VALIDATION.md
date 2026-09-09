# Verificação das etapas 1 e 2

Verificado em 9 de setembro de 2026, localmente, com Node.js 24.13.1.

| Verificação | Resultado |
|---|---|
| Servidor: suíte completa | 38 arquivos, 286 testes aprovados |
| Painel: suíte completa | 14 arquivos, 37 testes aprovados |
| SDK: sessão e inicialização, após a última correção | 2 arquivos, 12 testes aprovados |
| TypeScript | Servidor, painel e SDK aprovados |
| Build de distribuição | Servidor, SDK e Next.js concluídos; código de saída 0 |
| Artefatos do SDK | `widget.js`, `widget.bundle.js` e `widget.v0.2.0.js` idênticos; hash confere com `widget.manifest.json` |
| Diff | Sem erros de whitespace |

Os testes novos cobrem credencial por tenant, ausência de segredo em armazenamento, emissão curta, claims restritos, revogação e substituição, bloqueio entre domínios admin/widget, janela legada com prazo, todas as rotas de conversa para outro usuário, filtro SQL de proprietário e ausência de alterações quando o acesso falha. Os testes do SDK cobrem armazenamento por identidade, aborto, destruição tardia, onOpen, contexto da primeira mensagem e renovação proativa.

A suíte completa do SDK tinha três falhas anteriores: chamada a `client.escalate` ausente e dois testes de confirmação de `create_ticket`. Foram reproduzidas em cópia isolada do HEAD anterior, com os mesmos erros (22 aprovados, 3 falhas). A execução completa com as primeiras mudanças teve 27 aprovados e essas mesmas 3 falhas. Depois da última correção de limpeza de instância, os 12 testes de sessão/inicialização passaram. Esses problemas de ações/conectores continuam na etapa correspondente; a suíte completa do SDK não está inteiramente verde.

Os testes do servidor usam fixtures e mocks de serviços; o teste de autorização do banco inspeciona o SQL gerado e o comportamento diante de consulta sem resultado. A migração SQL ainda precisa ser aplicada e homologada contra o banco do ambiente de destino. Não houve implantação em produção, migração dos backends de clientes ou homologação visual em navegador nesta etapa. As garantias de roteamento MCP por tenant e retenção integral continuam fora desta entrega.

Para implantação e testes com os clientes, siga [SESSION-MIGRATION.md](SESSION-MIGRATION.md). Não use um rollback que restabeleça a aceitação de assinaturas do widget na administração.
