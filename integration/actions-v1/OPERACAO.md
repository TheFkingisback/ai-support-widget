# Operação das ações MCP

Escrita inicialmente desligada. Não usar o overlay de chaves no release de leitura.

1. Aplicar `server/src/migrations/004-action-proposals.sql` antes de iniciar o novo servidor. Migração aditiva; fazer backup do banco e preservar credenciais existentes.
2. Publicar servidor, painel e SDK 0.2.2. O asset fixado 0.2.1 permanece para clientes de leitura. Escrita exige SDK 0.2.2.
3. Homologar as sete consultas. `get_matching_sessions` e mutação direta ficam fora da allowlist.
4. TrackShare implementa `prepare_action`, `execute_action`, `get_action_status` conforme contrato. A ferramenta direta antiga não substitui essa implementação.
5. Gerar chave RSA exclusiva, mínimo 2048 bits, em cofre/arquivo fora do repositório. Instalar somente a pública e o `kid` acordado no TrackShare. Privada legível pelo usuário do container, protegida de outros usuários do host.
6. Configurar `SUPPORT_ACTION_KEY_PATH` e `MCP_ACTION_KEY_ID` no ambiente privado. Overlay `docker-compose.actions.yml` monta a chave como secret e define `MCP_ACTION_PRIVATE_KEY_FILE`. Chave inválida impede inicialização; ausência desabilita ações.
7. Usar overlay com Compose de produção inicialmente em homologação. Habilitar política no tenant de teste via PUT do cadastro MCP, mantendo as consultas. Nunca enviar privada, prova ou credencial pelo chat.
8. Concluir aceite conjunto antes de habilitar no tenant real. Única operação nesta versão: `reassign_session_car`.

Para desligar novas ações, salvar `actionPolicy.enabled=false`. Propostas pendentes tornam-se inválidas; alteração já em execução pode continuar no TrackShare. Resolver resultado incerto com configuração original e `get_action_status`. Não repetir execução nem apagar propostas para descobrir se funcionou.

Testes: `npm test --workspace server`; `ACTION_TEST_DATABASE_URL` para `aiwidget_dev` em localhost habilita testes reais de locks/constraints. `npm test --workspace widget`; `npm test --workspace web`; `node --test integration/v3/examples.test.mjs`.
