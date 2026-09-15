# Contrato de integração v3 — produção

Publicado em 15/09/2026. Runtime: `d87e664`; servidor `3.0.0`, SDK `0.2.1`.
Verificação registrada às `2026-09-15T09:22:04Z`, seguida de teste do adaptador pela URL pública.

Contrato vigente: [integration/v3/GUIA.md](integration/v3/GUIA.md).
Portal: <https://support-ai.pontes.uk/integration-v3/INICIAR.html>.
Os documentos SESSION-MIGRATION.md e PRODUCTION-RELEASE.md descrevem a publicação anterior e estão marcados como históricos. O prazo antigo de 21/09 foi substituído pelo corte autorizado deste release.

## Comportamento publicado

- Sessões de widget emitidas pela plataforma com credencial por tenant, sem aceitação de assinatura legada. Administração usa domínio de assinatura separado.
- MCP configurado por tenant: URL HTTPS pública, segredo cifrado, identidade delegada e allowlist de ferramentas declaradas de leitura. Sem configuração global ou token exchange no runtime.
- Contexto push obrigatório, validado e associado ao proprietário; redação e orçamento antes da persistência. Resposta de criação referencia o snapshot realmente salvo.
- Ausência de contexto, executor ou conector não produz sucesso aparente. As rotas indisponíveis retornam erro; ações não implementadas não são sugeridas como botões.
- Cadastro MCP no painel, SDK corrigido e portal apontando ao contrato atual.

## Evidências

312 testes do servidor, 31 do widget, 37 do painel e 2 dos adaptadores aprovados. Compilações/tipos aprovados. O teste de health foi atualizado para a versão 3.0.0; testes de transporte verificam DNS privado, redirecionamento, troca de destino e limite de stream.

53 verificações de produção passaram, incluindo resposta real do modelo, snapshot sanitizado, revogação, JWT antigo recusado, seis operações recusadas para outra pessoa e outro tenant, armazenamento MCP separado/cifrado e SHA-256 público. O adaptador entregue aos clientes também emitiu sessão e criou conversa pela URL HTTPS pública. CORS foi confirmado para todas as origens configuradas. Fixtures removidas ao término.

Os guias foram inspecionados no navegador em 1440, 768 e 390 pixels; busca, âncoras e arquivos relativos conferidos. O formulário MCP foi exercitado com API simulada, incluindo segredo mascarado, limpeza após salvar e desativação.

## Operação

Checkout ativo: `/root/ai-support-releases/current` → `/root/ai-support-releases/d87e664`.
Compose: projeto `ai-support-widget`, arquivo `docker-compose.prod.yml`, ambiente privado acessível pelo symlink `.env.prod` do release.

```sh
cd /root/ai-support-releases/current
docker compose -p ai-support-widget --env-file .env.prod -f docker-compose.prod.yml ps
```

Backup privado: `/root/ops-backups/2026-09-15-v3-d87e664` contém dump anterior, referências de containers/imagens, ambiente, build e relatórios. Não distribuir esse diretório: contém segredos.

Aplicada a migração aditiva `003-tenant-mcp.sql`. Os dois tokens de serviço históricos foram recriptografados em transação, com verificação de leitura, usando uma nova chave privada independente. O antigo JWT_SECRET do runtime foi substituído. As chaves atuais de administração/widget e as credenciais individuais existentes foram preservadas. Banco/Redis e aplicações de outros projetos não foram recriados.

Não recuperar disponibilidade reintroduzindo assinatura legada ou MCP global. Não restaurar ciphertext antigo usando a chave nova, nem executar um checkout antigo sem adaptar suas variáveis e política de autenticação. O backup de configuração e o dump são um par; qualquer recuperação deve preservar o isolamento e a compatibilidade da criptografia. Em incidente, desativar a integração afetada e corrigir o release mantendo o canal humano.

## Entrega aos clientes

Pacotes individuais gerados em `tmp/entrega/migracao-definitiva-2026-09-15`, com guia HTML/Markdown, anexo do projeto, schema, adaptadores, prompt, SDK, aceite, relatório da publicação e manifesto SHA-256. Os pacotes não incluem segredos.

TrackShare e Chronosfy ainda precisam adaptar e homologar seus aplicativos. As credenciais existentes continuam no ambiente privado do operador; a instalação no cofre do cliente depende do destino/responsável acordado. MCP está desligado para ambos até receber endpoint, credencial dedicada e ferramentas de leitura homologadas. Nenhuma consulta MCP a um servidor cliente foi certificada por esta publicação.

Retenção/expurgo integral, revisão completa de dependências, revogação imediata por pessoa, escrita MCP e conectores ainda não instalados permanecem fora do aceite desta migração. O contrato documenta essas limitações; este release não é certificação de encerramento de todos os achados históricos.
