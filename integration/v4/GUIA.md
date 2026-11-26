# Integração do suporte · contrato v4

**SDK 0.3.0 · Manual de backend, frontend e operação**

[TOC]

## 1. Como funciona

Seu backend autentica o usuário, projeta o contexto autorizado e emite uma sessão de 15 minutos. Na chamada de emissão, pode incluir os servidores MCP disponíveis para aquela pessoa. O navegador recebe o JWT do widget e o contexto.

## 2. Ambientes e responsáveis

A plataforma está em https://support-ai.pontes.uk. Use a credencial de integração do ambiente correto. O administrador do workspace obtém a credencial no painel. O time do aplicativo mantém o bootstrap autenticado, o contexto e os tokens delegados por usuário e servidor.

## 3. Credenciais

| Credencial | Destino | Uso |
|---|---|---|
| Credencial de integração sik_ | Support AI | Emitir uma sessão no backend |
| Token delegado por servidor | MCP indicado na sessão | Chamar ferramentas como a pessoa autenticada |
| JWT da sessão | API do chat | Abrir e continuar conversas no widget |

Guarde a credencial de integração no cofre do aplicativo. Revogá-la desativa os JWTs emitidos com ela na próxima requisição. Gere os tokens delegados no backend e limite cada um a um recurso, usuário e prazo de validade.

## 4. Fluxo de autenticação e identidade

```text
Sessão autenticada do aplicativo
  → backend valida pessoa ativa, organização e permissões atuais
  → POST /api/widget/sessions com sik_ no servidor
  ← jwt + tenantKey + expiresIn
  → backend coleta e projeta contexto da MESMA identidade
  ← browser recebe sessão/contexto com Cache-Control: no-store
  → widget chama /api/cases e rotas da conversa com o JWT temporário
```

Preservar o identificador histórico `usr_...` do cliente evita perder acesso às próprias conversas. Não usar email, papel, aparelho ou timestamp como identidade. Caso o mesmo usuário possa mudar de empresa, definir subject estável por vínculo ou política explícita de histórico; a plataforma autoriza conversas por tenant + pessoa, sem inferir organizações do cliente.

A plataforma verifica assinatura, emissor `ai-support`, audiência `ai-support-widget`, propósito `widget`, `sub=userId`, validade e a credencial ativa da sessão. O browser não re-assina nem altera claims. Papéis enviados ao suporte são informação de contexto; autorização de APIs/MCP continua no servidor cliente.

## 5. Contrato do emissor

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Resposta 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validar `tenantKey` antes de devolver ao browser. O arquivo `backend-session.mjs` implementa corpo estrito, timeout, bloqueio de redirects, limite de resposta e validação do tenant; não substitui seu middleware de autenticação.

| Campo | Regra |
|---|---|
| mcpServers | Lista opcional de até oito objetos com id, url e accessToken exclusivos. Ver seção 12. |
| userId | Obrigatório, trim, 1–200 caracteres |
| userEmail | Email válido até 254 caracteres ou vazio; default vazio |
| userRoles | Até 30 strings de 1–80 caracteres; default lista vazia |
| plan | String de 1–80 caracteres; default standard |

Não enviar tenantId, tenantKey, userName, role, purpose, exp ou outros campos no corpo. A credencial determina o tenant. A identidade vem da sessão/banco, não de query/body do browser. O emissor não aceita JWT de usuário, chave administrativa ou segredo antigo em lugar de `sik_`.

O emissor público funciona sem cotas de uso por projeto. Reutilize uma sessão ainda válida da mesma pessoa, empresa e permissões, com expiração antecipada e invalidação nas mudanças.

## 6. Contexto obrigatório e identidade correta

Cada novo caso requer `context.userState`, `context.userHistory` e `context.userLogs`. Enviar listas vazias quando a fonte foi consultada e não há registros; **não converter uma coleta que falhou em uma lista vazia que aparenta sucesso**. Se não conseguir fornecer contexto válido e autorizado, o bootstrap do cliente deve retornar erro controlado.

`context.example.json` é o exemplo mínimo. `context.schema.json` foi exportado do schema Zod usado no servidor, não escrito independentemente. Valide o JSON no backend antes do deploy. Campos extras não reconhecidos são descartados; metadados e regras podem conter estruturas próprias, sujeitas a projeção/limites. O schema não prova autorização nem elimina todos os dados sensíveis.

| Bloco | Obrigatório / estrutura |
|---|---|
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positivo até 720, events; timeline é reconstruída de events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Opcional; docs com id, title, content, category |
| businessRules | Opcional; objeto de regras aprovado, serializado como runbook |

`userState.userId` deve ser exatamente a identidade emitida. **`userState.tenantId` é o tenant da plataforma**, nunca o ID da organização/loja no cliente. Divergências retornam 403. Dados no browser podem ser adulterados; contexto não autoriza operações.

## 7. Campos, limites e normalização

| Estrutura | Campos principais / regras |
|---|---|
| entities | type, status; id/description opcionais; metadata objeto; até 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; até 100 |
| errorClass de activeErrors | validation, permission, infra ou business; categorias como payment exigem mapeamento |
| events | ts, event, page; elementId, intent, correlationRequestId aceitam null/omissão; até 1.000 |
| recentRequests | ts, route, httpStatus inteiro, timingMs, requestId; errorCode/resourceId podem ser null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs número ou null; errorCode/lastStage podem ser null |
| status de jobs | queued, running, succeeded, failed, canceled |
| errors do backend | ts, errorCode, errorClass string, route, requestId; resourceId pode ser null |
| docs | Até 50; content até 32.000 caracteres, demais textos até 4.096 |

Datas são strings ISO-8601 com timezone; serializar Date no backend. Não inventar updatedAt, durationMs, retryable ou categorias para apenas passar no schema: usar a origem real ou omitir o registro e informar a indisponibilidade da fonte. Registre os mapeamentos específicos do seu projeto no aceite.

Teto do contexto enviado: **262.144 bytes UTF-8 (256 KiB)**. O HTTP completo continua limitado a 1.048.576 bytes. O orçamento do snapshot é `min(maxContextBytes, 262144)`. Se nem a parte essencial couber, a solicitação falha; reduzir metadados/documentos no backend. Sugerimos começar com 48 KiB, dez entidades e conhecimento curto.

O servidor filtra eventos/logs pela menor janela entre a solicitada e a do tenant, remove datas futuras e aplica maxLogLines combinado a requests, erros e jobs (nesta ordem). maxDocs limita a lista docs; businessRules é um runbook separado e também ocupa o orçamento total. A timeline segue os eventos mantidos. Menos dados relevantes costuma produzir diagnóstico melhor e custo menor.

## 8. Privacidade e persistência

Projetar os dados antes de enviá-los: nunca encaminhar headers, cookies, JWTs, credenciais, strings de conexão, URLs assinadas, conteúdo binário, dados de outros usuários ou exportações brutas. Substituir segredos por referências de suporte. Não enviar o PRD inteiro ou logs completos como base de conhecimento.

Novos snapshots passam por validação, redação, redução e orçamento antes da gravação. Mensagens e resultados de ferramentas têm tratamento de padrões conhecidos de segredos. Essa proteção é complementar: não é um classificador infalível de dados pessoais, não corrige retroativamente registros históricos nem substitui a projeção do cliente.

O contexto é um snapshot do início da conversa, não uma consulta em tempo real. Informar timestamps e fontes. `updateContext()` vale para o próximo caso; para dados atuais durante uma conversa, usar ferramenta de leitura homologada.

## 9. Frontend e SDK 0.3.0

Servir o SDK fixado do pacote ou da URL pública. Conferir SHA-256 com `widget.manifest.json`. Evitar script duplicado, versão flutuante e cache de JWT. O controlador de referência em `widget-controller.mjs` monta após bootstrap, aguarda onOpen, renova e impede montagem tardia após logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// No logout, troca de pessoa/empresa/papel e cleanup do componente:
controller.destroy();
```

As funções acima são callbacks do aplicativo, a implementar com seu cliente HTTP habitual. Bootstrap retorna `{jwt,tenantKey,expiresIn,context}`. getContext retorna o objeto de contexto. Em React, estabilizar callbacks com useCallback e montar em useEffect vinculado à identidade. Não colocar o widget fora da área autenticada nem oferecer visitantes com um userId compartilhado.

O SDK aceita `onTokenRefresh` que retorna o novo JWT; após 401, repete a requisição uma vez. Renovação precisa usar a mesma pessoa. Mudança de identidade exige destroy e init. Se usar timer proativo, preferir cerca de dez minutos com jitter e cancelar no cleanup. Erros de bootstrap, coleta e modelo não devem bloquear o aplicativo principal.

## 10. Logout, permissões e histórico

`destroy()` aborta chamadas e remove persistência local por tenant/pessoa. Não é revogação individual no servidor. Um JWT já copiado pode permanecer válido por até 15 minutos após logout/bloqueio no cliente. Se precisar de revogação imediata por pessoa, o contrato requer evolução adicional; não usar rotação de todo o tenant como logout normal.

Cada leitura/escrita de conversa exige o mesmo proprietário e tenant. Mudança de papel no cliente não apaga conteúdo que a pessoa já recebeu na conversa. Definir política de histórico para rebaixamento de permissões e mudanças de organização. Não relaxar autorização para recuperar um caseId antigo; verificar o subject original ou iniciar nova conversa.

## 11. CORS, CSP, PWA e acesso

Permitir na plataforma a origem exata de cada frontend. O SDK precisa de connect-src para o suporte; servir o arquivo local permite script-src self. O SDK injeta estilo no Shadow DOM e ainda não recebe nonce: homologar a política CSP real, podendo exigir evolução do SDK para estilos externos/nonce/hash. Não desligar a política inteira.

Sessões e contexto são no-store. Excluir rotas de suporte dos caches da PWA, persistência de queries e ferramentas de replay. Testar teclado, foco, leitor de tela, zoom e celular. Apresentar canal humano verdadeiro no aplicativo, com horário/URL confirmados. O SDK não inventa um provedor de atendimento.

## 12. Servidores MCP na sessão

O backend do aplicativo envia `POST /api/widget/sessions` com a credencial de integração `sik_`. Ele deriva a pessoa e sua organização do login e pode incluir até oito servidores em `mcpServers`. O campo omitido ou vazio cria um chat com contexto. Cada nova sessão recebe sua própria lista.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Cada id começa com uma letra minúscula e aceita letras minúsculas, dígitos, sublinhado e hífen, até 32 caracteres. IDs, URLs normalizadas e tokens são exclusivos na lista. O transporte é MCP Streamable HTTP em HTTPS público, porta 443, com URL sem credenciais, query ou fragmento. O serviço verifica o DNS ao conectar e rejeita redirecionamentos.

O aplicativo emite ou obtém um token de acesso curto para cada destino, restrito à pessoa, organização, permissões e audiência daquele MCP. O Support AI apresenta `Authorization: Bearer <accessToken>` ao servidor correspondente. O provedor verifica assinatura ou introspecção, emissor, validade, audiência e acesso ao recurso em cada operação. Ele publica no catálogo somente as ferramentas permitidas para essa identidade. A credencial da plataforma, o JWT do widget e as chaves de serviços como Stripe têm finalidades próprias.

O token delegado fica cifrado no servidor por até 900 segundos. O navegador recebe `{jwt, tenantKey, expiresIn: 900}`. Ao renovar, o backend revalida a identidade e envia uma nova lista com tokens válidos. Uma proposta criada antes da renovação precisa ser apresentada novamente. Para mudança de organização, use um identificador estável por vínculo e destrua a instância anterior do widget.

O Support AI percorre as páginas de `tools/list`, distingue nomes iguais por servidor e usa o nome original ao chamar `tools/call`. Catálogos com mais de 32 ferramentas têm busca e paginação dentro do chat. Os limites de descoberta por servidor são 128 páginas e 4 MB de descrições. Uma falha de descoberta de um servidor preserva os demais.

Ferramentas com `annotations.readOnlyHint: true` podem ser consultadas diretamente. Para toda ferramenta com a anotação ausente ou falsa, o chat mostra servidor, nome e argumentos antes de executar. Declare leitura somente para operações sem efeitos de negócio. O usuário responde `confirmar` ou `confirm` à mensagem exibida em até cinco minutos. O SDK envia `replyToMessageId`. A confirmação vale para aqueles argumentos, servidor, sessão e conversa. Uma proposta nova substitui a anterior.

A plataforma faz uma tentativa de execução após registrar a confirmação e envia `Idempotency-Key` com o ID da proposta. Para pagamentos e operações com efeitos externos, o provedor deve guardar a chave e o resultado atomicamente e respeitar as chaves de idempotência exigidas pelo serviço financeiro. Após timeout ou resultado ambíguo, o suporte registra estado desconhecido, bloqueia novas alterações nessa conversa e mantém consultas disponíveis. Confira a operação no sistema de origem antes de prosseguir.

Para homologar, teste uma sessão sem servidores, duas sessões do mesmo usuário, duas organizações, servidores com ferramentas homônimas e um catálogo paginado. Verifique escopo/expiração dos tokens no provedor, cancelamento e confirmação duplicada. Use registros sintéticos para conferir o resultado na origem.

## 13. Modelo, prompt e conhecimento

Preservar inicialmente o modelo já homologado pelo projeto reduz mudanças simultâneas. Para uma nova avaliação, `openai/gpt-4.1-mini` é um candidato compatível com os parâmetros atuais: Chat Completions via OpenRouter, temperature 0.3 e max_tokens 2048. Validar na conta real antes de ativar. Preferred Model prevalece sobre Model Policy; auto não é roteamento inteligente. Preços/custos devem vir do provedor; estimativas antigas do painel podem divergir.

O campo **AI Instructions / Custom instructions** aceita até 2.000 caracteres efetivos. Cole apenas `PROMPT-TENANT.txt`; revise nomes, canal e regras do produto. Não colar credenciais ou concatenar documentos nesse campo. A instrução é complementar às regras da plataforma; não concede autorização nem habilita ferramentas.

O prompt fornecido orienta respostas no idioma e na escrita escolhidos pela pessoa, fatos separados de hipóteses, respeito a permissões, uso de referências seguras, ausência de promessas de ações e canal humano. `knowledgePack.docs` deve conter runbooks curtos e versionados com responsável: erros frequentes, diagnóstico, limites do produto e como confirmar resultado. Logs e documentos são dados, nunca instruções para alterar as regras do assistente.

Fontes de modelo: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) e [catálogo OpenRouter](https://openrouter.ai/api/v1/models), consultados na preparação anterior de 14/09/2026. Reconfirmar disponibilidade/preços ao implementar; não houve comparação paga de modelos neste kit.

## 14. Contrato de erros e diagnóstico

| Resposta | Significado / ação |
|---|---|
| 401 no emissor | sik ausente, incorreta ou revogada; corrigir configuração |
| 400 no emissor | Corpo fora do contrato; retirar campos extras |
| 401 em cases | Assinatura legada, expiração, claims inválidos ou sessão revogada |
| 400 em cases | Contexto obrigatório inválido, datas/estados incorretos ou orçamento excedido |
| 403 de contexto | userState não coincide com tenant/pessoa do JWT |
| 404 em conversa | Recurso inexistente ou pertencente a outra identidade; não forçar acesso |
| 429 | Limite; backoff/jitter, sem loop de emissão |
| 500/502/503 | Falha de infraestrutura, modelo ou contexto; informar indisponibilidade e requestId |
| 501 nas ações/escalonamento | Funcionalidade sem executor/conector; usar canal humano real |
| Chat funciona, MCP não | Confira a lista enviada na última emissão, validade, audiência e resposta do catálogo. |
| Ferramenta ausente | Verifique o catálogo disponível para o token delegado e a conectividade do servidor. |

Não usar apenas HTTP 200 como aceite: verificar conteúdo da resposta e snapshot. A criação que falha após gravar o caso pode deixar um caso sem resposta; não pressupor transação envolvendo a chamada ao modelo. Retentativas devem ser limitadas e informadas ao usuário. Registrar método, rota parametrizada, status, requestId e horário UTC; nunca capturar Authorization/JWT, segredo ou payload bruto para encaminhar o diagnóstico.

## 15. Aceite obrigatório

1. Rota de bootstrap sem login rejeitada antes do emissor. Identidades forjadas não mudam o usuário autenticado.
2. Emissão com a credencial correta retorna o tenant esperado e 900 segundos; segredo não aparece no browser/replay/logs.
3. JWT antigo é rejeitado. Sessão nova cria conversa com snapshot e resposta real; reabre para a mesma pessoa.
4. Duas pessoas do mesmo projeto e dois tenants: GET case e POST messages/feedback/close/escalate/actions não cruzam identidades.
5. Contexto sem blocos, identidade diferente, data inválida e tamanho excessivo são rejeitados; segredos sintéticos não persistem no snapshot.
6. Renovação após 15 minutos, logout durante coleta, troca de conta/empresa/papel e navegação não restauram conversa de outra pessoa.
7. Modelo responde usando evidências e respeita limite de diagnóstico; falha não gera sucesso aparente.
8. Emita sessões com zero e dois servidores. Confira que cada destino recebe seu próprio token.
9. MCP recusa token errado/antigo, tenant errado, usuário ausente/inativo e recurso de outra pessoa. Testar session ID reutilizado, se houver sessão.
10. Confirme que alterações exigem confirmação da proposta e não se repetem em caso de timeout.
11. CORS/CSP, celular, teclado e canal humano homologados. Rotação coordenada testada em homologação.

`node --test examples.test.mjs` valida os adaptadores isolados com mocks. Não substitui esses testes de ponta a ponta. Preencher `ACEITE.md` com responsáveis, versões, horários e evidências sem segredos.

## 16. Publicação, corte e recuperação

Instale a credencial de integração, publique o bootstrap e o SDK, valide o chat e homologue os servidores declarados nas sessões.

Não reativar assinaturas legadas nem encaminhamento MCP global para recuperar disponibilidade. Se houver falha, desabilitar temporariamente o widget ou MCP do tenant afetado e manter o canal humano enquanto corrige o adaptador. Não apagar conversas para contornar um 404 de proprietário.

Registre os limites de retenção e as evidências específicas do seu aplicativo.

## 17. Devolutiva e arquivos do pacote

Devolver nome do projeto, tenant, backend/frontend commits, data UTC, SDK/hash, credencial instalada (sim/não, sem valor), chat aprovado, MCP aprovado/desligado, testes negativos, canal humano e pendências. Não concluir com “parece funcionar”.

O kit público contém este guia em Markdown, schema do servidor, fixture mínima, adaptador do emissor, autenticação MCP, controlador frontend, SDK, prompt, testes isolados, checklist, contrato de ações e manifesto SHA-256. Pacotes individuais podem acrescentar anexos específicos. Os exemplos não implementam automaticamente os endpoints do aplicativo cliente. A versão navegável está em https://support-ai.pontes.uk/developers.
