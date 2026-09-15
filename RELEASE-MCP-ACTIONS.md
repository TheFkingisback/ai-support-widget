# MCP TrackShare e ações pelo chat — 15/09/2026

## Decisão de produto

Contrato: [ações 1.1](integration/actions-v1/CONTRATO.md). Antes: MCP exclusivamente de leitura, ações indisponíveis. Novo: manter consultas e acrescentar preparação/confirmação humana/execução pelo chat, por tenant, inicialmente desligadas. Motivo: resolver solicitações sem tirar o usuário do atendimento, mantendo regras no aplicativo cliente.

Impacto: propostas persistentes, confirmação vinculada à versão exata apresentada, SDK 0.2.2, assinatura exclusiva das ações e nova política opcional. Não há lógica de carros/sessões no suporte; só o nome da primeira operação permitida. O modelo prepara, mas não autoriza nem executa. Resumo vem do TrackShare sem reescrita.

## Implementação e validação

- Banco: migração aditiva 004, uma proposta não resolvida por tenant/pessoa/conversa, recuperação após reinício, histórico e expurgo das propostas terminais com a conversa.
- Travas de conversas em pool separado; execução incerta bloqueia substituição e consulta estado sem repetir alteração.
- Confirmação exige nova mensagem humana e `replyToMessageId` da apresentação. JWT renovado continua válido para a mesma identidade.
- Transporte MCP: correção da corrida de cancelamento do stream detectada no Node 20 durante homologação real. DNS, destino, timeout e limite de resposta preservados.
- 340 testes servidor (incluindo PostgreSQL real), 33 SDK, 38 painel, 2 adaptadores aprovados. Builds servidor, SDK e painel aprovados.
- Cliente MCP corrigido testado no servidor contra as sete ferramentas, com duas contas e recursos sintéticos; 16 verificações positivas/negativas aprovadas e fixtures removidas.

## Publicação e pendências

Implementação registrada no commit `6f84ab7`. Pacote restrito de publicação pronto: 25 arquivos, 147.099 bytes de código/assets públicos. A revisão automática bloqueou sua transferência e exige autorização explícita do proprietário para o payload e o servidor de destino. Publicação e teste completo pelo chat aguardam essa autorização. Conector TrackShare temporariamente desabilitado até concluir a troca do transporte. Não há chave privada de ações configurada nem escrita habilitada.

TrackShare ainda precisa implementar o contrato de preparação, execução, estado, invalidação da proposta substituída, prova e idempotência. Depois: instalar chave pública, atualizar SDK do aplicativo e homologar permissões/estado/corridas. Só então ativar `reassign_session_car`.

O release v3 anterior permanece registrado em RELEASE-V3.md. Esta entrega não certifica controles do provedor que ainda não foram implementados.
