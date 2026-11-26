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

## MCP e frontend

Emita uma sessão com o servidor do TrackShare e um token delegado para a pessoa e sua organização. O MCP valida o token para a audiência correta e aplica escopo a cada recurso. O SDK 0.3.0 renova pelo backend e vincula a confirmação à proposta. Homologue uma consulta de upload, o isolamento entre membros e uma alteração sintética conforme MCP.md.
