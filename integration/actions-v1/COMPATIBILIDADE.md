# Compatibilidade dos pacotes de integração

Verificação de 15/09/2026 para o release do suporte `4d40be6`.

## Pacotes já enviados

Os ZIPs `TrackShare-integracao-v3-2026-09-15.zip` e `Chronosfy-integracao-v3-2026-09-15.zip` continuam compatíveis com autenticação, contexto, chat e consultas MCP. Seus 16 arquivos por pacote conferem com os manifestos; os quatro testes dos adaptadores passaram. `backend-session.mjs`, `mcp-auth.mjs`, `widget-controller.mjs`, `context.schema.json` e `widget.v0.2.1.js` são idênticos às referências preservadas neste release.

Não é necessário refazer a integração v3 por causa da configuração self-service. Credenciais existentes não são rotacionadas nesta publicação. Uma instalação que ainda não concluiu a migração v3 precisa concluir os passos e testes do pacote; compatibilidade não certifica a instalação do cliente.

Pacotes anteriores ao v3 que ensinam assinatura JWT com segredo compartilhado são legados e não devem ser usados. Esse corte já ocorreu no release v3 anterior.

## Mudanças de documentação e novas ações

O cadastro MCP antes descrito como tarefa do operador agora pode ser feito pelo administrador do próprio tenant em `/admin` → **Configure your tenant integration** → **Integration settings**, usando sua chave administrativa `tsk_`. Isso não é a credencial do widget nem o token MCP.

Para continuar apenas com chat e consultas, SDK 0.2.1 é suficiente. Seu arquivo fixado permanece disponível sem alteração. Os aliases sem versão `widget.js` e `widget.bundle.js` acompanham o SDK 0.2.2.

Para executar alterações com confirmação humana pelo chat, o cliente precisa atualizar para SDK 0.2.2 e implementar o [contrato genérico de ações 1.2](CONTRATO.md) no seu MCP. As operações são configuração self-service; regras de negócio, autorização, execução e idempotência pertencem ao provedor.

A publicação do código não habilita escrita por si só. A infraestrutura de assinatura precisa estar disponível, o provedor deve validar a chave pública e os cenários de confirmação/execução devem ser homologados antes de ativar operações.

## Estado da publicação

O resultado da publicação e dos testes de produção está em [RELEASE-MCP-ACTIONS.md](../../RELEASE-MCP-ACTIONS.md). Os ZIPs originais foram preservados; este documento é um complemento, não altera seus manifestos nem resultados históricos.
