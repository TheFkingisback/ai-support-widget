> **SUPERSEDED — contrato v3, 15/09/2026.** Este documento é histórico. Consulte [o contrato vigente](integration/v3/GUIA.md). O novo release encerra a compatibilidade antiga imediatamente e substitui o MCP global por configuração por tenant. O prazo antigo de 21/09 não se aplica.

# Migração de autenticação e isolamento de conversas

Esta entrega implementa as etapas 1 e 2: administração com chave de assinatura própria, sessão de widget emitida por credencial de tenant, autorização por usuário em todas as operações de conversa e ciclo de vida do SDK. A migração de produção depende da aplicação do SQL e da atualização dos backends clientes. O código não migra os clientes automaticamente.

## Contrato para o cliente

No painel do tenant, em **Widget integration**, gere uma credencial `sik_...`. Salve-a somente no cofre do backend cliente. Ela é diferente de `tsk_...`, que não deve ser usada para emitir sessões. O painel mostra o segredo uma única vez; o banco guarda apenas seu hash. Substituição/revogação invalidam a credencial e suas sessões já emitidas na próxima requisição autenticada.

O backend cliente autentica sua própria sessão, resolve usuário/papéis/plano e faz:

```http
POST /api/widget/sessions
Authorization: Bearer <CREDENCIAL_DE_INTEGRACAO>
Content-Type: application/json

{"userId":"usr_example","userEmail":"user@example.com","userRoles":["member"],"plan":"standard"}
```

Resposta: `{ "jwt": "...", "tenantKey": "ten_...", "expiresIn": 900 }`, com `Cache-Control: no-store`. O tenant é resolvido pela credencial; enviar `tenantId`, `role`, `purpose` ou `exp` no corpo é rejeitado. O backend cliente deve derivar `userId` da sessão autenticada e usar IDs únicos no projeto. A credencial autoriza esse backend a representar usuários do seu próprio tenant, não a escolher outro tenant ou administrar a plataforma.

O backend acrescenta o contexto já autorizado e retorna o bootstrap ao navegador com `no-store`. O widget recebe somente o JWT temporário. Renovação usa a mesma rota do backend cliente; nunca faça chamadas ao emissor com `sik_...` no navegador. Trate 401/503, limite tentativas e não bloqueie o uso do restante do aplicativo se o suporte falhar.

## Configuração do operador

1. Execute `server/src/migrations/002-integration-credentials.sql` no banco de homologação. A migração é aditiva e não remove conversas ou configurações existentes. Aplique o mesmo SQL no banco de produção somente na janela de lançamento combinada.
2. Gere `ADMIN_JWT_SECRET` e `WIDGET_JWT_SECRET` novos e independentes, com pelo menos 32 caracteres aleatórios cada. O processo recusa chaves iguais entre si ou iguais a `JWT_SECRET`. Não publique os valores em logs, documentação ou repositórios.
3. Preserve `JWT_SECRET` durante a migração: ele serve apenas à validação legada explicitamente habilitada e pode estar associado à criptografia de service tokens antigos. Não o rotacione nem altere `TOKEN_ENCRYPTION_KEY` sem recriptografar os dados correspondentes.
4. O novo admin exige emissor `ai-support`, audiência `ai-support-admin` e propósito `admin`. Tokens administrativos anteriores deixam de funcionar; entre novamente com email e senha. A chave administrativa de API permanece um mecanismo separado.
5. Para clientes ainda não migrados, configure os IDs exatos em `LEGACY_WIDGET_TENANTS` e um instante UTC em `LEGACY_WIDGET_ACCEPT_UNTIL`. A janela não pode exceder sete dias a partir da inicialização. Sem os dois campos a compatibilidade fica desabilitada; atingido o prazo, as requisições antigas são rejeitadas sem depender de reinício.
6. Publicar o backend novo sem preparar essa compatibilidade ou migrar os clientes interrompe as sessões antigas. Não use um deadline renovado a cada restart. A janela é uma concessão temporária: detentores do segredo antigo ainda conseguem assinar por usuários dos tenants legados permitidos. Ela não constitui isolamento criptográfico entre esses clientes.

## Ordem da migração dos clientes atuais

- Homologue primeiro o servidor, a migração SQL e o painel. Teste o login administrativo, uma credencial por projeto e dois usuários por projeto.
- Prepare uma alteração no backend de cada cliente para substituir a assinatura local por `POST /api/widget/sessions`. Preserve os IDs existentes para que cada pessoa continue acessando suas próprias conversas.
- Publique a plataforma com a janela legada mínima necessária, separando imediatamente a autenticação administrativa. Gere e distribua credenciais específicas por canal seguro.
- Migre um backend por vez e teste emissão, renovação, abertura de conversa, logout e acesso negado a outro usuário. Use o JWT retornado pelo emissor sem acrescentar claims no cliente.
- Remova cada tenant da lista legada assim que sua migração for concluída. Ao final, retire as variáveis de compatibilidade e remova o segredo de assinatura dos backends clientes.
- Não reverta para uma versão que volte a aceitar o segredo do widget no admin. Em caso de falha no emissor, desabilite temporariamente o suporte afetado e mantenha o canal alternativo de atendimento enquanto aplica a correção.

## SDK

O build publica o mesmo bundle em `widget.js` e `widget.bundle.js`. O estado persistido usa a combinação tenant/usuário; a chave antiga apenas por tenant é descartada. Claims decodificados no navegador particionam armazenamento e não concedem autorização.

Chame `destroy()` ao sair, trocar usuário/organização ou desmontar a integração. Requisições pendentes são abortadas, a conversa armazenada daquela identidade é removida e carregamentos atrasados não remontam o painel. `updateJwt` aceita renovação da mesma identidade; mudança de identidade exige nova inicialização. `onOpen` é aguardado antes de abrir; erros rejeitam `open()` e devem ser tratados pelo aplicativo.

`updateContext(context)` atualiza o contexto usado ao criar o próximo caso, inclusive se o painel ainda não enviou a primeira mensagem. Ele não altera o snapshot de uma conversa já criada. Consultas atuais durante uma conversa ainda dependem de ferramentas corretamente configuradas.

## Critérios de homologação

1. JWT de widget, JWT antigo com papel administrativo e credencial `sik_...` não autenticam nas rotas de admin.
2. JWT de admin, token sem identidade, propósito/audiência incorretos e sessão expirada não autenticam no gateway.
3. Usuário B não lê, envia mensagem, avalia, fecha, encaminha nem executa ação em conversa de A; repita entre tenants. Verifique também ausência de chamadas ao modelo/conector em pedidos negados.
4. Rotação/revogação bloqueiam a credencial antiga e as sessões vinculadas. O backend do cliente consegue recuperar o serviço com a credencial nova.
5. Credencial de A não emite sessão de B, mesmo quando o corpo tenta selecionar tenant ou privilégios.
6. Logout durante coleta, refresh ou restauração não reapresenta dados. Reabertura por outra pessoa não restaura a conversa anterior.
7. Depois do prazo de migração, tokens legados são rejeitados. Depois de retirar um tenant da lista e reiniciar, seus tokens legados são rejeitados mesmo antes desse prazo.

## Pendências separadas

O roteamento MCP por tenant, o token exchange sem fallback permissivo, os conectores reais e a aplicação integral de retenção/limites pertencem às próximas etapas. Esta entrega não os certifica. Não habilite uma nova empresa externa em uma instância que ainda encaminhe suas chamadas ao MCP global de outro projeto. O ZIP da edição 1.0 descreve o estado anterior e precisa de uma nova edição após a homologação da implementação e das integrações restantes.
