# MCP genérico e configuração self-service — 15/09/2026

## Decisão de produto

Contrato: [ações 1.2](integration/actions-v1/CONTRATO.md). Antes: MCP exclusivamente de leitura, ações indisponíveis. Novo: manter consultas e acrescentar preparação/confirmação humana/execução pelo chat, por tenant, inicialmente desligadas. Motivo: resolver solicitações sem tirar o usuário do atendimento, mantendo regras no aplicativo cliente.

Impacto: propostas persistentes, confirmação vinculada à versão exata apresentada, SDK 0.2.2, assinatura exclusiva das ações e nova política opcional. Não há lógica nem nome fixo de operação de cliente no suporte. O tenant configura endpoint, credencial, consultas e operações no painel self-service. A revisão 1.2 remove a restrição indevida a uma operação do TrackShare existente na 1.1. O modelo prepara, mas não autoriza nem executa. Resumo vem do provedor MCP sem reescrita. Regras de negócio e execução permanecem nesse provedor.

## Implementação e validação

- Banco: migração aditiva 004, uma proposta não resolvida por tenant/pessoa/conversa, recuperação após reinício, histórico e expurgo das propostas terminais com a conversa.
- Travas de conversas em pool separado; execução incerta bloqueia substituição e consulta estado sem repetir alteração.
- Confirmação exige nova mensagem humana e `replyToMessageId` da apresentação. JWT renovado continua válido para a mesma identidade.
- Transporte MCP: correção da corrida de cancelamento do stream detectada no Node 20 durante homologação real. DNS, destino, timeout e limite de resposta preservados.
- Revisão 1.2: 345 testes servidor (incluindo PostgreSQL real) e 41 painel aprovados; builds servidor e painel aprovados. SDK e adaptadores não alterados nesta revisão; validação anterior: 33 SDK e 2 adaptadores aprovados.
- Testes adicionais: operações genéricas de outros domínios; CRUD self-service; isolamento de tenant por chave e JWT; bloqueio de administração global; chave revogada; indisponibilidade de assinatura e configuração pelo painel.
- Cliente MCP corrigido testado no servidor contra as sete ferramentas, com duas contas e recursos sintéticos; 16 verificações positivas/negativas aprovadas e fixtures removidas.

## Publicação e pendências

Implementação anterior registrada no commit `6f84ab7`. A correção genérica/self-service desta revisão é local e não foi publicada. O pacote anterior de 25 arquivos (147.099 bytes) ficou obsoleto; precisa ser recomposto para a revisão 1.2. A revisão automática bloqueou sua transferência e exige autorização explícita do proprietário para o payload e o servidor de destino. Publicação e teste completo pelo chat aguardam essa autorização. Conector TrackShare temporariamente desabilitado até concluir a troca do transporte. Não há chave privada de ações configurada nem escrita habilitada.

TrackShare ainda precisa implementar o contrato de preparação, execução, estado, invalidação da proposta substituída, prova e idempotência. Depois: instalar chave pública, atualizar SDK do aplicativo e homologar permissões/estado/corridas. Só então ativar `reassign_session_car`.

O release v3 anterior permanece registrado em RELEASE-V3.md. Esta entrega não certifica controles do provedor que ainda não foram implementados.

## Histórico da correção conceitual — 1.2

Antes: lista de operações limitada no código a `reassign_session_car` e cadastro MCP restrito ao superadministrador. Novo: nomes validados como configuração do tenant, editáveis pelo administrador do próprio tenant no painel comum, com a credencial administrativa existente. Motivo: nenhuma especialização de código por cliente; diferenças somente por configuração self-service. TrackShare permanece exemplo e homologação específica, não condição no runtime.

A infraestrutura de assinatura é instalada uma vez para a plataforma. Cada cliente obtém a chave pública no painel e configura seu provedor; a privada nunca sai da plataforma. Não foram alterados domínios, contas Google, Pix ou sistemas de outros clientes nesta correção.
