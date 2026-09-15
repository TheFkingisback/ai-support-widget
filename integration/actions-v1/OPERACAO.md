# Operação das ações MCP — contrato 1.2

Código único para todos os clientes. Preparação da infraestrutura é global; configuração de cada integração é self-service. Implementação local validada, publicação pendente; escrita desligada em produção.

## Instalação da plataforma

1. Aplicar `server/src/migrations/004-action-proposals.sql` antes de iniciar o servidor. Migração aditiva; fazer backup do banco e preservar credenciais existentes.
2. Publicar servidor, painel e SDK 0.2.2. O asset fixado 0.2.1 permanece para clientes de leitura; escrita exige SDK 0.2.2.
3. Para disponibilizar ações, gerar chave RSA exclusiva da plataforma, mínimo 2048 bits, fora do repositório. Não gerar uma implementação por tenant.
4. Configurar `SUPPORT_ACTION_KEY_PATH` e `MCP_ACTION_KEY_ID` no ambiente privado. `docker-compose.actions.yml` monta a chave como secret e define `MCP_ACTION_PRIVATE_KEY_FILE`. Chave inválida impede inicialização; ausência mantém ações indisponíveis para todos, sem bloquear consultas.
5. Testar o overlay em homologação. O painel publica a parte pública, emissor, algoritmo e `kid`; privada e provas nunca são expostas.

## Configuração pelo cliente

1. Acessar `/admin` → **Configure your tenant integration**, com a chave administrativa `tsk_` emitida no cadastro do tenant. Se foi perdida, o operador pode gerar substituta no cadastro; não usar `sik_`, segredo MCP ou conta de superadministrador.
2. Em **Integration settings**, gerar/substituir/revogar a credencial do widget e instalar o valor emitido no backend cliente.
3. Em **Tenant MCP**, cadastrar endpoint público HTTPS, credencial MCP própria e consultas permitidas. Salvar; testar identidade, consultas, acessos indevidos, erros e indisponibilidade.
4. O provedor implementa `prepare_action`, `execute_action`, `get_action_status` conforme o contrato genérico. As regras de negócio são dele.
5. Copiar **Verification key for your MCP provider** do painel e instalar a chave pública no provedor com emissor, algoritmo e `kid` esperados. Não confiar em chaves fornecidas dentro da prova.
6. Preencher **Allowed operation names**, marcar **Enable human-confirmed actions**, informar novamente a credencial e salvar. Fazer primeiro no tenant de homologação, depois no real após aceite. Não exige edição de código, banco ou autorização manual do operador para cada configuração.
7. No exemplo TrackShare, homologar primeiro as sete consultas e depois configurar apenas `reassign_session_car`. Esse recorte é configuração do cliente, não limite do produto.

Para desligar novas ações, salvar `actionPolicy.enabled=false`. Propostas pendentes tornam-se inválidas; execução já iniciada pode continuar no provedor. Resolver resultado incerto com configuração original e `get_action_status`. Não repetir execução nem apagar propostas para descobrir se funcionou.

A chave administrativa dá acesso somente à própria integração e consultas administrativas do próprio tenant previstas na API; não permite criar tenants, mudar planos/quotas nem consultar/expurgar sessões globais. Revogação/rotação da chave é consultada a cada requisição. A sessão do painel usa sessionStorage, sem enviar a chave ao widget ou modelo.

Testes: `npm test --workspace server`; `ACTION_TEST_DATABASE_URL` para `aiwidget_dev` em localhost habilita testes reais de locks/constraints. `npm test --workspace widget`; `npm test --workspace web`; `node --test integration/v3/examples.test.mjs`.
