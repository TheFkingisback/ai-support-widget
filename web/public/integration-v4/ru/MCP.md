# MCP за сеанс

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

Support AI просматривает страницы `tools/list`, различает одинаковые имена по серверу и использует исходное имя при вызове `tools/call`. Каталоги с более чем 32 инструментами имеют поиск и пагинацию в чате. Лимиты обнаружения на сервер составляют 128 страниц и 4 МБ описаний. Сбой обнаружения одного сервера сохраняет остальные.

Инструменты с `annotations.readOnlyHint: true` можно запрашивать напрямую. Для каждого инструмента с отсутствующей или ложной аннотацией чат показывает сервер, имя и аргументы перед выполнением. Объявляйте только чтение для операций без бизнес-эффектов. Пользователь отвечает `confirmar` или `confirm` на отображаемое сообщение в течение пяти минут. SDK отправляет `replyToMessageId`. Подтверждение действительно для этих аргументов, сервера, сессии и разговора. Новое предложение заменяет предыдущее.

Платформа делает попытку выполнения после регистрации подтверждения и отправляет `Idempotency-Key` с ID предложения. Для платежей и операций с внешними эффектами провайдер должен атомарно сохранять ключ и результат и соблюдать ключи идемпотентности, требуемые финансовой службой. После таймаута или неоднозначного результата поддержка регистрирует неизвестное состояние, блокирует новые изменения в этом разговоре и сохраняет доступные запросы. Проверьте операцию в исходной системе перед продолжением.

Для аттестации протестируйте сессию без серверов, две сессии одного пользователя, две организации, серверы с одноименными инструментами и каталоги с пагинацией. Проверьте область действия/срок действия токенов у провайдера, отмену и дублирование подтверждения. Используйте синтетические записи для проверки результата в источнике.
