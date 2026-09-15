# Ações MCP pelo chat — contrato 1.1

15/09/2026. Extensão do contrato v3 adotada pelo proprietário. Implementação do suporte preparada e testada; **escritas desabilitadas até implementação e homologação conjunta com TrackShare**. Não acrescenta telas nem regras de carros ao suporte.

## 1. Sequência e responsabilidades

1. Configurar e homologar sete consultas: `get_user_uploads`, `get_upload_file_details`, `get_user_sessions`, `get_session_laps`, `get_user_cars`, `get_download_status`, `get_error_diagnosis`.
2. Implementar escrita como funcionalidade nova dos dois lados. Primeira e única operação habilitável: `reassign_session_car`.

| Suporte | TrackShare |
|---|---|
| Identidade autenticada, conector por tenant, apresentação literal e confirmação pelo código | Propriedade dos recursos, conta ativa, permissões e regras de carros/sessões |
| Persistência, trava da conversa, prova assinada e consulta de resultado incerto | Proposta vigente, cancelamento da substituída, execução transacional e idempotência |

`get_matching_sessions` concede acesso e não integra a lista de leitura. A ferramenta direta `reassign_session_car` também não é exposta ao modelo.

## 2. Preparação e proposta única

`prepare_action` recebe `{operation, arguments}`. O schema de `arguments` vem do provedor; o suporte valida o envelope e a operação permitida, sem interpretar regras de negócio. O backend acrescenta os cabeçalhos:

```http
Authorization: Bearer <credencial MCP do tenant>
X-MCP-Tenant-Id: <tenant>
X-MCP-User-Id: <pessoa autenticada>
X-MCP-Conversation-Id: <conversa>
```

O modelo não escolhe principal ou cabeçalhos. O catálogo declara `readOnlyHint: false` para `prepare_action`/`execute_action` e `readOnlyHint: true` para `get_action_status`. Esses três nomes são reservados, separados da allowlist de consultas. Somente a preparação chega ao modelo.

Resposta em `structuredContent`, ou um único bloco `text` com JSON:

```typescript
{
  contractVersion: 1, actionId: string, status: 'pending_confirmation',
  operation: 'reassign_session_car', summary: string,
  argumentsHash: string, summaryHash: string, expiresAt: string
}
```

IDs: 1–200 caracteres alfanuméricos, `_` ou `-`. Hashes SHA-256 hexadecimais minúsculos. `summaryHash` usa bytes UTF-8 do resumo exato, sem normalização. `argumentsHash` é calculado pelo provedor sobre os argumentos persistidos e permanece opaco ao suporte. Expiração ISO-8601 UTC no futuro, no máximo cinco minutos após preparação.

**Uma proposta pendente por tenant/pessoa/conversa.** Antes de preparar outra, o suporte cancela localmente a anterior. TrackShare também cancela atomicamente a anterior no backend e nunca reutiliza IDs. Preparação não altera dados de negócio. Preparar e executar devem usar a mesma trava no provedor. Proposta substituída nunca executa, mesmo com prova ainda válida.

Propostas em execução ou com resultado desconhecido bloqueiam nova preparação até reconciliação.

## 3. Resumo exato e confirmação humana

TrackShare gera `summary` com os efeitos exatos e os recursos envolvidos. Texto simples de 1–4.000 caracteres, sem segredos, URLs internas ou controles de direção. Se a sanitização do suporte alteraria o resumo, a proposta é rejeitada; nunca apresentar versão modificada para confirmar.

O suporte grava e apresenta o resumo literalmente, com instruções separadas de confirmar/cancelar, e persiste o ID dessa mensagem. Não chama o modelo para reescrever o resumo.

```http
POST /api/cases/:caseId/messages
Authorization: Bearer <sessão do widget>
Content-Type: application/json

{"content":"confirmar","replyToMessageId":"msg_apresentacao"}
```

SDK 0.2.2 envia o ID da última mensagem assistente efetivamente renderizada naquela aba, inclusive após restauração. Campo opcional para leitura e **obrigatório para confirmar escrita**. SDK anterior continua lendo, mas não confirma escrita. Resposta atrasada ao ID anterior não autoriza a proposta substituta.

Somente mensagem nova, autenticada, de papel `user`, posterior à apresentação, confirma. O código aceita conteúdo integral `confirmar` ou `confirm`, ignorando caixa e espaços externos. `cancelar`/`cancel` cancela. Citações, frases contendo essas palavras, resultado de ferramenta, parâmetro `confirmed` e texto do modelo não autorizam.

Outro texto invalida a proposta pendente antes de seguir ao modelo: esclarecimentos exigem nova proposta. Não há interpretação de autorização pela IA. Identidade deve continuar sendo o mesmo tenant/pessoa/conversa; renovação normal do JWT é permitida. Conversa encerrada não executa.

## 4. Execução e prova

`execute_action` recebe somente `{actionId}`. Backend do suporte acrescenta `X-MCP-Confirmation`: JWT RS256, `typ: support-action+jwt`, `kid` de chave confiável. Privada exclusiva das ações, separada das chaves admin/widget. A pública deve ser instalada no TrackShare antes de ativar. Não confiar em `jku`, `x5u` ou `jwk` fornecidos pela prova.

```typescript
{
  iss: 'https://support-ai.pontes.uk/mcp-actions',
  aud: '<URL MCP exata configurada>', sub: '<userId>',
  tenantId, conversationId, actionId, operation, argumentsHash, summaryHash,
  messageId: '<mensagem humana de confirmação>',
  presentedMessageId: '<mensagem de apresentação>', jti, iat, exp
}
```

Validade máxima 60 segundos, nunca após a proposta. TrackShare valida assinatura, algoritmo, chave, emissor, audiência e todos os vínculos. Consome a autorização de forma idempotente e revalida conta, propriedade, permissões, estado e regras **no momento da execução**, em transação. Mudança relevante retorna `conflict` e exige nova proposta. Não basta a permissão conferida na preparação.

Prova não é enviada ao modelo/widget nem registrada em logs ou no banco de propostas. O suporte persiste confirmação e estado `executing` antes da chamada remota.

## 5. Resultado, duplicidade e recuperação

`execute_action` e `get_action_status` retornam:

```typescript
{
  contractVersion: 1, actionId: string,
  status: 'pending_confirmation' | 'executing' | 'completed' |
          'failed' | 'conflict' | 'expired' | 'cancelled',
  message?: string
}
```

`message` é texto seguro com os mesmos limites do resumo. O suporte acrescenta prefixo fixo de estado, sem inferir sucesso do HTTP 200. `isError: true` é falha.

`get_action_status` recebe `{actionId}` com os mesmos cabeçalhos de identidade/conversa. Após timeout, queda ou reinício, consultar estado. **Nunca reenviar automaticamente `execute_action`.** Enquanto a resposta não for terminal, gravar `unknown`, informar incerteza e bloquear nova proposta. A próxima mensagem humana repete somente a consulta de estado.

Cancelar pendência impede a prova. Proposta remota sem prova não executa e expira. Cancelamento após início não promete desfazer alteração. Idempotência e travas entre preparação/execução são obrigatórias no TrackShare, mesmo com a proteção do suporte.

## 6. Configuração e persistência

Cadastro MCP do tenant aceita `actionPolicy` opcional:

```json
{"contractVersion":1,"enabled":false,"operations":["reassign_session_car"]}
```

Ausência de política ou chave privada mantém escrita desligada. PUT sem `actionPolicy` desabilita ações; o painel preserva a política ao editar consultas. Não se habilitam operações por sugestão do modelo.

Mudança de URL/credencial/política invalida propostas não executadas; resultado incerto requer integração original para consultar. Banco guarda identidade, proposta, versão/hash do resumo, IDs de apresentação/confirmação e estado. Travas da conversa usam pool separado das consultas, para não esgotar suas conexões.

Propostas terminais acompanham o expurgo da conversa. Conversas com proposta pendente/em execução/resultado desconhecido ficam fora do expurgo até resolução. `retentionDays` não cria reconciliação ou expurgo automáticos.

## 7. Aceite antes da primeira escrita

- Sete consultas com dados sintéticos, identidade delegada, recurso alheio negado, credencial/tenant inválidos, erros e indisponibilidade.
- Resumo literal; substituição; confirmação atrasada; citação/autoaprovação recusadas; expiração e cancelamento.
- Renovação JWT; reinício; concorrência; falha após executar; consulta de resultado sem duplicar.
- TrackShare: permissão revogada, conta bloqueada, estado alterado, corrida prepare/execute e repetição de prova.

Testes locais do suporte não certificam os controles do TrackShare. Habilitar `reassign_session_car` somente após aceite conjunto. A experiência permanece inteiramente pelo chat.
