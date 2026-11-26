# MCP mỗi phiên

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
