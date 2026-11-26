# Chronosfy · alterações específicas obrigatórias

Tenant existente na plataforma: `ten_4d2439931eee44ea`. Preservar subject `usr_${user_id}` derivado de request.auth. O tenant_id de negócio do Chronosfy é diferente do tenant da plataforma de suporte.

## Backend de sessão

Em `src/modules/support/support.routes.ts`, manter GET `/support/widget-token` com fastify.authenticate. Remover jwt.sign e SUPPORT_WIDGET_JWT_SECRET da emissão. Usar `issueSupportSession({userId: 'usr_'+user_id,userEmail:user?.email ?? '',userRoles:[papel_atual],plan:tenant?.plan ?? 'starter'})`. Consultar papel/usuário ativo no banco e manter filtro/vínculo de organização. Devolver session com no-store. Instalar SUPPORT_INTEGRATION_CREDENTIAL, SUPPORT_API_URL e SUPPORT_TENANT_ID no backend.

Preservar GET `/support/context`, protegido por sessão do usuário, para a coleta do frontend. Não usar dbAdmin ou um token global como substituto de autorização do usuário na rota nova. Auditar as rotas pull antigas e desabilitá-las quando não houver outro consumidor autorizado; a plataforma v3 não as chama.

## Projeção de contexto — diferenças encontradas

| Origem atual | Adequação |
|---|---|
| support.context.routes.ts: userState omite userId e tenantId | Adicionar userId = usr_ + request.auth.user_id; tenantId = `ten_4d2439931eee44ea` |
| Rota antiga /support/user-state retorna tenantId = ten_ + organização | Não reutilizar esse valor no push; o tenant do suporte é o fixo acima |
| activeErrors usa errorClass payment | Mapear para business quando for recusa/regra de pagamento; falha técnica para infra conforme catálogo. Preservar o código específico |
| backend.errors usa payment/email | Esses campos aceitam string; não confundir com o enum mais restrito de activeErrors |
| jobs usa status do run log | Mapear estados reais; success → succeeded se esse for o estado da origem; não converter falha em sucesso |
| summary e profile.tenantName extras | Se necessários, projetar em metadata de entidade autorizada; campos extras são descartados |
| clickTimeline de telemetria separado | Projetar cliques relevantes em userHistory.events para conservar a timeline |
| Logs contêm IDs de pagamento e dados de cobrança | Reduzir ao necessário; não enviar credenciais do Stripe, dados completos de cartão ou conteúdo de mensagens |

Revisar `support.context-entities.ts`, `support.context-logs.ts` e `support.context-builder.ts` com context.schema.json. As consultas atuais são por organização; o backend ainda deve verificar se o papel da pessoa pode acessar cada categoria. Pertencer à organização não implica acesso irrestrito a todos os dados.

## Frontend

Em `frontend/src/components/support-widget/SupportWidget.tsx`, manter o fluxo das duas rotas, SDK 0.3.0 e callbacks autenticadas. Montar somente após token e contexto válidos. Renovação usa /support/widget-token; onOpen atualiza o contexto do próximo caso. Destroy no logout e ao mudar pessoa/empresa/papel; não persistir token/contexto no cache da PWA.

## APIs e MCP

Ao emitir a sessão, o backend pode fornecer o servidor MCP de agentes em mcpServers e um token delegado com audiência desse servidor e escopos da pessoa. O catálogo já inclui get_recurrence e pause_recurrence. Declare readOnlyHint: true nas consultas sem efeitos. A pausa usa a confirmação do widget e chama a operação nativa. Homologue a identidade do usuário, a organização, o catálogo paginado e a confirmação usando uma recorrência sintética. Consulte MCP.md.
