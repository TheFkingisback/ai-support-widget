# Projeto inicial do AI Support Widget

Extraia o ZIP e execute `node server.mjs` com o Node.js 22 ou superior. Abra no navegador o endereço local exibido no terminal. Abra o chat de suporte e pergunte por que a importação falhou. A resposta identifica a linha 42 e mostra as referências fictícias da importação e do erro. Reinicie a demonstração para começar outra conversa.

O arquivo `server.mjs` serve a demonstração no seu computador. O script `starter/sample.js` roda no navegador e responde com dados de exemplo locais. O arquivo `widget.v0.3.0.js` contém a versão do widget incluída no pacote. Confira o SHA-256 em `widget.manifest.json`.

A demonstração abre no idioma deste kit. Acrescente `?lang=sr-Latn`, `?lang=sr-Cyrl` ou `?lang=ar` ao endereço para experimentar outro idioma. Ao montar o SDK no seu aplicativo, informe o idioma escolhido pela pessoa.

Para integrar seu aplicativo, remova o script de dados fictícios e registre o manipulador `createBootstrapHandler`, de `bootstrap.mjs`, no servidor do aplicativo em uma rota como `/api/support/bootstrap`. Forneça `authenticate(request)` a partir do middleware de sessão e `collectContext(user, tenantKey, signal)` a partir da camada de dados. Configure as variáveis de ambiente privadas listadas em `backend.env.example`. Inicialize o widget com o token e o contexto que a rota devolver. Para oferecer atendimento humano, configure `handoffUrl` com o endereço HTTPS da sua página de suporte. Consulte o [guia de início rápido](https://support-ai.pontes.uk/developers/quick-start?lang=pt-BR) para ver o ciclo de vida da sessão.

O backend pode fornecer a função `getMcpServers(user, signal)` ao manipulador de bootstrap. Ela deve devolver uma lista de objetos `{id, url, accessToken}` para o vínculo autenticado entre a pessoa e a organização. Emita um token de curta duração com a audiência de cada servidor. Omita a função para oferecer chat apenas com contexto. O navegador recebe somente a sessão do widget e o contexto.
