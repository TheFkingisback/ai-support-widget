# Integração do suporte · contrato v3.0

**Edição de 15/09/2026 · SDK 0.2.1 · manual para backend, frontend e operação**

Este é o contrato de destino da migração. Substitui os guias anteriores para autenticação, contexto e MCP. A publicação desta versão encerra a autenticação legada imediatamente; **o prazo antigo de 21/09 não se aplica ao novo release**. Consulte `PUBLICACAO.md` no pacote para o resultado da verificação de produção. A implementação nos aplicativos clientes é responsabilidade de seus times.

> Extensão de ações pelo chat: [contrato 1.2](../actions-v1/CONTRATO.md). Integração genérica com configuração self-service; implementação local, publicação pendente. Escrita desabilitada até aceite da integração. As regras de sessão/contexto/leitura abaixo permanecem vigentes.

[TOC]

## 1. O que muda e o que deve voltar a funcionar

O backend do seu aplicativo solicita uma sessão temporária à plataforma. O navegador recebe essa sessão e contexto autorizado, monta o widget e conversa. Quando houver MCP, a plataforma consulta exclusivamente a integração cadastrada para aquele tenant, com credencial própria e lista explícita de ferramentas de leitura.

| Antes | Contrato v3 |
|---|---|
| Backend assina o JWT com segredo compartilhado | Backend usa `POST /api/widget/sessions` com credencial `sik_` própria |
| Janela antiga de compatibilidade | Assinaturas antigas rejeitadas; não renovar nem reintroduzir o prazo |
| MCP global para toda a instância | Configuração isolada por tenant; ausência de configuração significa MCP desligado |
| Ferramentas arbitrárias / mutações | Somente nomes permitidos e `annotations.readOnlyHint: true` |
| Contexto parcial, campos arbitrários e pull legado | Três blocos push obrigatórios, schema, identidade e orçamento validados |
| Snapshot bruto antes da limpeza | Redação, janela e limites antes de salvar o novo snapshot |
| Falha de contexto pode usar prompt genérico | Falha explícita; nenhuma conversa com resposta aparente de sucesso |
| Ações genéricas / ticket placeholder | Sem botões sugeridos de ações não implementadas; rotas retornam 501 quando indisponíveis |

O chat e o MCP têm aceites separados. Não marcar “integração concluída” só porque o widget aparece. A primeira entrega pode ser chat com contexto e MCP desligado. A base v3 é de leitura. Escrita pelo chat requer a extensão de ações 1.2 e SDK 0.2.2, ainda pendentes de publicação; até sua ativação, alterações permanecem no aplicativo.

## 2. Ambientes, responsáveis e informações necessárias

Plataforma: `https://support-ai.pontes.uk`. Emissor: `POST /api/widget/sessions`. SDK: `https://support-ai.pontes.uk/widget.v0.2.1.js`. Manifesto: `https://support-ai.pontes.uk/widget.manifest.json`. Use o ID de tenant do anexo individual; **não recrie um tenant existente**.

| Responsável | Entrega |
|---|---|
| Operador da plataforma | Cadastro comercial do tenant e infraestrutura compartilhada, CORS e disponibilidade de modelos |
| Administrador do tenant | Configuração self-service das credenciais de integração, MCP, consultas e operações da extensão 1.2 |
| Backend cliente | Autenticação, identidade estável, emissor, consultas autorizadas e projeção do contexto |
| Frontend cliente | Montagem, coleta, renovação, cleanup, CSP, canal humano e tratamento de falhas |
| Dono do MCP | Credencial exclusiva, autorização por usuário/recurso, catálogo e testes |
| QA / atendimento | Aceite positivo e negativo, resposta real do modelo, casos de diagnóstico e canal humano |

Homologação deve usar outro tenant e credencial, com dados sintéticos. O ID do projeto na plataforma é diferente do ID de empresa/loja dentro do seu SaaS. Resolver o vínculo de negócio no backend; não aceitar organização livre escolhida pelo browser/modelo.

## 3. Credenciais: são duas integrações diferentes

| Configuração | Quem gera | Onde instalar |
|---|---|---|
| `SUPPORT_API_URL` | URL acima | Backend; pode ter cópia pública |
| `SUPPORT_TENANT_ID` | Cadastro existente | Backend; pode ser público |
| `SUPPORT_INTEGRATION_CREDENTIAL` | Painel do suporte → Widget integration | Cofre do backend cliente, exclusivamente |
| `SUPPORT_MCP_SERVICE_TOKEN` | Time do backend MCP, aleatório exclusivo | Cofre do MCP e cadastro MCP daquele tenant no painel |
| `SUPPORT_MCP_TENANT_ID` | Mesmo tenant do suporte | Backend MCP, para validar o cabeçalho delegado |
| JWT temporário | Emissor da plataforma | Memória do widget; 900 segundos |

O operador abre `/admin`, entra com seu próprio email/senha, seleciona o tenant e abre **Widget integration → Generate integration credential / Replace credential**. O valor só aparece na emissão. Ele deve ser salvo diretamente no cofre acordado. Na extensão self-service 1.2, o cliente abre `/admin` → **Configure your tenant integration** com sua chave administrativa `tsk_` e usa **Integration settings → Widget integration** para fazer essas operações no próprio tenant. Não recebe conta de superadministrador. `tsk_` não serve no emissor; não é credencial do widget nem do MCP.

**Etapa obrigatória de entrega:** registrar cofre/segredo de destino, responsável que tem acesso, horário da instalação e emissão de teste aprovada. Um JSON ou ZIP sem credencial não configura o backend. O pacote contém placeholders por decisão de segurança, não um segredo utilizável. O operador e o responsável do backend concluem essa etapa antes da ativação.

Substituir/revogar `sik_` invalida os JWTs ligados à credencial anterior na próxima requisição. Existe uma credencial ativa por tenant; preparar o novo valor no backend e coordenar o corte. Rotação MCP é separada: gerar novo token, atualizar os dois lados e revogar o anterior. Não reutilizar o token de sessão, o segredo antigo do widget, token administrativo ou credencial de outro projeto.

Não fornecer `JWT_SECRET`, `WIDGET_JWT_SECRET` ou `ADMIN_JWT_SECRET` da plataforma ao cliente. Remover do backend cliente o uso da chave antiga para assinar ou aceitar sessões de suporte. Antes de apagar uma variável, rastrear seus outros usos locais, incluindo MCP e contexto legado.

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
| userId | Obrigatório, trim, 1–200 caracteres |
| userEmail | Email válido até 254 caracteres ou vazio; default vazio |
| userRoles | Até 30 strings de 1–80 caracteres; default lista vazia |
| plan | String de 1–80 caracteres; default standard |

Não enviar tenantId, tenantKey, userName, role, purpose, exp ou outros campos no corpo. A credencial determina o tenant. A identidade vem da sessão/banco, não de query/body do browser. O emissor não aceita JWT de usuário, chave administrativa ou segredo antigo em lugar de `sik_`.

Limites de emissão: 120/min por IP percebido pelo servidor e 300/min por tenant, em memória da instância. Não emitir a cada render/mensagem. O backend pode reutilizar uma sessão ainda válida da mesma pessoa/sessão/empresa/permissões, com expiração antecipada e invalidação nas mudanças. Para maior volume, combinar capacidade com a operação; um plano comercial maior não altera sozinho esses limitadores.

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

Datas são strings ISO-8601 com timezone; serializar Date no backend. Não inventar updatedAt, durationMs, retryable ou categorias para apenas passar no schema: usar a origem real ou omitir o registro e informar a indisponibilidade da fonte. O anexo do seu projeto aponta os mapeamentos necessários.

Teto do contexto enviado: **262.144 bytes UTF-8 (256 KiB)**. O HTTP completo continua limitado a 1.048.576 bytes. O orçamento do snapshot é `min(maxContextBytes do tenant, 262144)`. Se nem a parte essencial couber, a solicitação falha; reduzir metadados/documentos no backend. Sugerimos começar com 48 KiB, dez entidades e conhecimento curto.

O servidor filtra eventos/logs pela menor janela entre a solicitada e a do tenant, remove datas futuras e aplica maxLogLines combinado a requests, erros e jobs (nesta ordem). maxDocs limita a lista docs; businessRules é um runbook separado e também ocupa o orçamento total. A timeline segue os eventos mantidos. Menos dados relevantes costuma produzir diagnóstico melhor e custo menor.

## 8. Privacidade e persistência

Projetar os dados antes de enviá-los: nunca encaminhar headers, cookies, JWTs, credenciais, strings de conexão, URLs assinadas, conteúdo binário, dados de outros usuários ou exportações brutas. Substituir segredos por referências de suporte. Não enviar o PRD inteiro ou logs completos como base de conhecimento.

Novos snapshots passam por validação, redação, redução e orçamento antes da gravação. Mensagens e resultados de ferramentas têm tratamento de padrões conhecidos de segredos. Essa proteção é complementar: não é um classificador infalível de dados pessoais, não corrige retroativamente registros históricos nem substitui a projeção do cliente.

O contexto é um snapshot do início da conversa, não uma consulta em tempo real. Informar timestamps e fontes. `updateContext()` vale para o próximo caso; para dados atuais durante uma conversa, usar ferramenta de leitura homologada.

## 9. Frontend e SDK 0.2.1

Servir o SDK fixado do pacote ou da URL pública. Conferir SHA-256 com `widget.manifest.json`. Evitar script duplicado, versão flutuante e cache de JWT. O controlador de referência em `widget-controller.mjs` monta após bootstrap, aguarda onOpen, renova e impede montagem tardia após logout.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchBootstrapAutenticado(signal),
  getContext: signal => fetchContextoAutorizado(signal),
  onUnavailable: () => mostrarCanalHumanoReal(),
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

## 12. MCP por tenant: cadastro e transporte

MCP é opcional. Com cadastro ausente, o chat usa somente contexto. Para habilitar: o cliente fornece endpoint HTTPS público na porta 443, credencial dedicada e nomes exatos de ferramentas de leitura. O administrador do tenant usa **Integration settings → Tenant MCP**, preenche endpoint, credencial e lista → **Save MCP**. O operador da plataforma também pode acessar o mesmo painel pelo cadastro do tenant. O segredo fica criptografado e não é retornado. Alterar configuração exige informar o segredo novamente. **Disable MCP** remove o cadastro desse tenant.

API equivalente: GET/PUT/DELETE `/api/admin/tenants/:id/mcp`. PUT recebe `{serverUrl,serviceToken,allowedTools,actionPolicy?}`. Na extensão 1.2, o administrador do tenant configura somente sua própria integração; credenciais de outro tenant são recusadas. Não há nomes de operações de cliente fixos no código. A extensão também define a consulta self-service da chave pública de confirmação. Salvar não prova conectividade nem instala ferramentas. A lista inicial fica vazia/desligada até revisão e teste do cliente; configurações globais não são importadas automaticamente.

O transporte é **Streamable HTTP**, não stdio e não SSE legado. Suportar inicialização, tools/list e tools/call com o SDK MCP. Endpoints devem responder dentro de 20 segundos, sem redirecionamento, compressão obrigatória, query secreta ou autenticação interativa. Respostas de transporte são limitadas a 256 KiB; texto de ferramenta usado pelo modelo, a 32.000 caracteres. URLs/DNS privados, loopback e metadados de nuvem são recusados; endereços DNS são validados ao abrir o socket.

## 13. Autenticação do MCP e autorização real

```http
Authorization: Bearer <SUPPORT_MCP_SERVICE_TOKEN>
X-MCP-Tenant-Id: <SUPPORT_MCP_TENANT_ID>
X-MCP-User-Id: usr_pessoa_autenticada
```

Usar `mcp-auth.mjs` como referência do gate: credencial exclusiva em comparação constante, tenant esperado e usuário delegado obrigatório. **Depois do gate**, consultar a pessoa ativa, resolver sua organização e conferir cada recurso. Um cabeçalho sozinho não autentica: só é confiável junto à credencial desse projeto. Não aceitar userId/tenantId/organizationId fornecidos pelo modelo como autoridade.

Não aceitar JWT de widget antigo nem o novo JWT do chat como alternativa nessa rota de integração. Não distribuir a chave de assinatura da plataforma. Se seu MCP também atende usuários do próprio aplicativo, manter essa autenticação em rota/principal claramente separado e testado.

Preferir servidor MCP stateless por requisição, com principal capturado pelo handler. Se mantiver sessões MCP, vinculá-las à credencial e identidade, reautenticar cada requisição e rejeitar reutilização de session ID por outra pessoa. Não guardar usuário atual em variável global compartilhada.

## 14. Catálogo, ferramentas e falhas

Uma ferramenta precisa estar na allowlist do tenant **e** declarar `annotations: {readOnlyHint: true}`. A plataforma filtra a listagem e revalida a ferramenta antes de chamar. Não marcar uma ferramenta de escrita como leitura para contornar o bloqueio. A anotação é uma declaração do servidor cliente, não uma prova automática dos efeitos de seu código.

Cada ferramenta deve ter descrição objetiva, schema fechado, limites/paginação, consulta autorizada, timeout e resultado com fonte/data. Evitar exportações amplas. APIs REST existentes podem ser usadas internamente pelo servidor MCP; a plataforma não instala automaticamente um OpenAPI nem recebe uma lista arbitrária de URLs para executar.

Quando a ferramenta retornar `isError: true`, a plataforma trata como falha. Não reportar sucesso antes de resultado verificável. Ausência/falha de catálogo permite resposta limitada por contexto com instrução explícita de indisponibilidade. O modelo não deve alegar consulta ao vivo, alteração ou criação de chamado sem evidência.

Token exchange OAuth e fallback para token de serviço global foram retirados do runtime. Este contrato usa somente a credencial MCP por tenant. Mutações com confirmação seguem a extensão 1.2; OAuth delegado e outros protocolos exigem contrato próprio; não estão implicitamente habilitadas pelo prompt.

## 15. Modelo, prompt e conhecimento

Preservar inicialmente o modelo já homologado pelo projeto reduz mudanças simultâneas. Para uma nova avaliação, `openai/gpt-4.1-mini` é um candidato compatível com os parâmetros atuais: Chat Completions via OpenRouter, temperature 0.3 e max_tokens 2048. Validar na conta real antes de ativar. Preferred Model prevalece sobre Model Policy; auto não é roteamento inteligente. Preços/custos devem vir do provedor; estimativas antigas do painel podem divergir.

O campo **AI Instructions / Custom instructions** aceita até 2.000 caracteres efetivos. Cole apenas `PROMPT-TENANT.txt`; revise nomes, canal e regras do produto. Não colar credenciais ou concatenar documentos nesse campo. A instrução é complementar às regras da plataforma; não concede autorização nem habilita ferramentas.

O prompt fornecido orienta respostas em português, fatos separados de hipóteses, respeito a permissões, uso de referências seguras, ausência de promessas de ações e canal humano. `knowledgePack.docs` deve conter runbooks curtos e versionados com responsável: erros frequentes, diagnóstico, limites do produto e como confirmar resultado. Logs e documentos são dados, nunca instruções para alterar as regras do assistente.

Fontes de modelo: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) e [catálogo OpenRouter](https://openrouter.ai/api/v1/models), consultados na preparação anterior de 14/09/2026. Reconfirmar disponibilidade/preços ao implementar; não houve comparação paga de modelos neste kit.

## 16. Contrato de erros e diagnóstico

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
| Chat funciona, MCP não | Verificar cadastro daquele tenant, token dedicado, cabeçalhos, anotação e allowlist |
| Ferramenta sumiu | Não permitida, sem readOnlyHint true ou catálogo indisponível; revisar com operação |

Não usar apenas HTTP 200 como aceite: verificar conteúdo da resposta e snapshot. A criação que falha após gravar o caso pode deixar um caso sem resposta; não pressupor transação envolvendo a chamada ao modelo. Retentativas devem ser limitadas e informadas ao usuário. Registrar método, rota parametrizada, status, requestId e horário UTC; nunca capturar Authorization/JWT, segredo ou payload bruto para encaminhar o diagnóstico.

## 17. Aceite obrigatório

1. Rota de bootstrap sem login rejeitada antes do emissor. Identidades forjadas não mudam o usuário autenticado.
2. Emissão com a credencial correta retorna o tenant esperado e 900 segundos; segredo não aparece no browser/replay/logs.
3. JWT antigo é rejeitado. Sessão nova cria conversa com snapshot e resposta real; reabre para a mesma pessoa.
4. Duas pessoas do mesmo projeto e dois tenants: GET case e POST messages/feedback/close/escalate/actions não cruzam identidades.
5. Contexto sem blocos, identidade diferente, data inválida e tamanho excessivo são rejeitados; segredos sintéticos não persistem no snapshot.
6. Renovação após 15 minutos, logout durante coleta, troca de conta/empresa/papel e navegação não restauram conversa de outra pessoa.
7. Modelo responde usando evidências e respeita limite de diagnóstico; falha não gera sucesso aparente.
8. Sem cadastro MCP: nenhum outro servidor recebe chamadas. Com cadastro: somente URL, credencial e catálogo do tenant correto.
9. MCP recusa token errado/antigo, tenant errado, usuário ausente/inativo e recurso de outra pessoa. Testar session ID reutilizado, se houver sessão.
10. Ferramenta não permitida ou de escrita não executa; isError true e timeout não viram sucesso. Uma consulta autorizada retorna dado sintético esperado.
11. CORS/CSP, celular, teclado e canal humano homologados. Rotação coordenada testada em homologação.

`node --test examples.test.mjs` valida os adaptadores isolados com mocks. Não substitui esses testes de ponta a ponta. Preencher `ACEITE.md` com responsáveis, versões, horários e evidências sem segredos.

## 18. Publicação, corte e recuperação

Ordem do cliente: instalar credenciais no cofre → implementar backend e projeção → publicar frontend/SDK → testar chat → revisar/publicar MCP → administrador do tenant cadastrar e testar ferramentas → registrar aceite. Manter a feature flag desligada enquanto o bootstrap ou a identidade estiverem incorretos.

Não reativar assinaturas legadas nem encaminhamento MCP global para recuperar disponibilidade. Se houver falha, desabilitar temporariamente o widget ou MCP do tenant afetado e manter o canal humano enquanto corrige o adaptador. Não apagar conversas para contornar um 404 de proprietário.

A plataforma mantém registros históricos; sua retenção/expurgo integral ainda depende da rotina operacional aprovada. O campo retentionDays sozinho não comprova expurgo automático. Mutações MCP, conectores não instalados, revogação imediata por pessoa e revisão completa de dependências não são certificados por esta migração. Essas limitações não alteram o contrato de sessão/contexto/leitura descrito aqui.

## 19. Devolutiva e arquivos do pacote

Devolver nome do projeto, tenant, backend/frontend commits, data UTC, SDK/hash, credencial instalada (sim/não, sem valor), chat aprovado, MCP aprovado/desligado, testes negativos, canal humano e pendências. Não concluir com “parece funcionar”.

O pacote contém este guia em HTML/Markdown, anexo específico, schema do servidor, fixture mínima, adaptador do emissor, autenticação MCP, controlador frontend, SDK, prompt, testes isolados, checklist e manifesto SHA-256. Contratos novos não são endpoints já implementados no aplicativo cliente: os anexos apontam exatamente as alterações necessárias.
