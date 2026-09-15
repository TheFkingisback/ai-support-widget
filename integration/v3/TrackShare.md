# TrackShare · alterações específicas obrigatórias

Tenant existente: `ten_e27a8792406248b1`. Não recriar. Preservar o subject `usr_${user.id}` derivado de `request.userId` autenticado. Referências são do checkout inspecionado; confirmar o commit que o time publicará.

## Backend e ambiente

Em `src/modules/support/support.token.routes.ts`, manter o hook `authMiddleware`, consulta ao usuário e rota `/token` no prefixo atual. Remover `jwt.sign`, a dependência de WIDGET_JWT_SECRET e a montagem local dos claims. Chamar `issueSupportSession` com userId, userEmail, userRoles e plan, depois retornar `{...session,context}` com no-store. Adicionar SUPPORT_API_URL, SUPPORT_TENANT_ID e SUPPORT_INTEGRATION_CREDENTIAL ao schema de ambiente/deploy. O usuário deve continuar ativo e autorizado no momento da emissão/renovação.

Não aceitar `userName` no emissor. Nome opcional pertence ao contexto já autorizado. Remover o padrão `.catch(() => null)` como substituto de coleta válida: se a fonte falhar, devolver indisponibilidade controlada ou um contexto reduzido que represente essa limitação explicitamente.

## Projeção de contexto — diferenças encontradas no código

| Origem atual em support.context.service.ts | Adequação |
|---|---|
| userState contém userId, mas não tenantId | Acrescentar tenantId exatamente `ten_e27a8792406248b1` no backend |
| activeErrors não inclui retryable, userActionable, resourceId | Completar pelo catálogo de erros e recurso real. Se recurso não existir, string vazia; nunca inventar ID. Não deduzir retryability apenas de texto |
| userHistory.events tem resourceType/resourceId/metadata, sem page | Projetar event/page/ts e opcionais; usar page vazia se não disponível. Metadados próprios não entram automaticamente na timeline |
| clickTimeline separado | Converter cliques relevantes em events com page/event; timeline fornecida é reconstruída |
| jobs usa estado de upload e não possui updatedAt/durationMs | Mapear o estado real para queued/running/succeeded/failed/canceled; consultar timestamp real de atualização e duração ou null. Se não disponível, omitir o job e indicar limitação |
| Campos Date do banco | Serializar ISO com timezone antes da validação |
| Rankings e laps em metadata | Selecionar somente o necessário para a pessoa; limitar tamanho e não vazar outros pilotos |

O schema final rejeita estrutura incompleta; validate context.schema.json antes de publicar. Não basta substituir a função que assina JWT.

## MCP — revisão independente do chat

Em `src/modules/mcp/mcp.auth.ts`, retirar o ramo que faz `jwt.verify(token, env.WIDGET_JWT_SECRET)`. Para a rota usada pela plataforma, autenticar SUPPORT_MCP_SERVICE_TOKEN exclusivo, X-MCP-Tenant-Id e X-MCP-User-Id com o helper do kit. Depois mapear `usr_<uuid>` para UUID, validar formato, usuário ativo e escopo em cada consulta. Preservar autenticação própria do TrackShare somente em rota/principal separado, se necessária.

O `mcp.server.ts` já cria servidor por requisição com userId capturado nos handlers. Preservar esse isolamento. Revisar cada ferramenta em `src/modules/mcp/tools/`: campos de usuário enviados pelo modelo não podem trocar esse principal.

`reassign-session-car.ts` altera dados e **não será habilitada** neste contrato. Orientar o usuário a fazer a mudança na interface do TrackShare. Ferramentas de download precisam ser revisadas: retornar credenciais/URLs assinadas ou gerar efeitos não é uma simples leitura segura. Não incluí-las por padrão. Ferramentas de diagnóstico/consulta só entram depois de revisão, declaração readOnlyHint true e allowlist explícita no painel.

Rotacionar também o antigo token de serviço se ele era compartilhado com outros projetos. Não remover apenas a assinatura do endpoint de chat e deixar o MCP aceitando a chave antiga.

## Frontend e aceite

Atualizar o componente de suporte identificado pelo time no frontend: consumir tenantKey retornado pelo backend, carregar SDK 0.2.1, coletar contexto válido, renovar na mesma rota autenticada, destruir no logout/troca de pessoa. Testar uma consulta sintética de upload/sessão da pessoa A, recusa da pessoa B, erro de parser e ausência de ferramentas de escrita. Devolver resultados separados para chat e MCP.
