> **SUPERSEDED — contrato v3, 15/09/2026.** Este documento é histórico. Consulte [o contrato vigente](integration/v3/GUIA.md). O novo release encerra a compatibilidade antiga imediatamente e substitui o MCP global por configuração por tenant. O prazo antigo de 21/09 não se aplica.

# Publicação de segurança — 14 de setembro de 2026

O código do commit `181da55` está em produção. Foram publicados a separação entre autenticação administrativa e sessões do widget, o emissor por credencial de tenant, a autorização de conversas por proprietário e o SDK `0.2.0`.

## Estado verificado

- Backend e painel saudáveis; banco e Redis respondem.
- Migração aditiva `002-integration-credentials.sql` aplicada, sem remoção de conversas existentes.
- 57 verificações de integração passaram no ambiente real: emissão e substituição de credenciais, invalidação de sessões anteriores, separação admin/widget, corpo estrito do emissor e seis operações de conversa negadas a outro usuário e a outro tenant.
- Os testes usaram identidades e casos sintéticos. A limpeza foi confirmada com zero casos de teste restantes.
- Os três bundles públicos conferem com o manifesto do SDK. SHA-256: `d0d89e373d3e6f1c4e6352ed04c11fff6acd0cfc73d7d3ca00afc852580488de`.
- Verificações adicionais pelo domínio público: health, admin, autenticação e quick start retornaram 200; emissão sem credencial retornou 401.

As suítes e limitações locais estão em [SESSION-VALIDATION.md](SESSION-VALIDATION.md). O teste administrativo positivo em produção verificou a autenticação com a nova chave de assinatura; o teste de login por senha verificou rejeição de senha inválida. A senha de uma pessoa real não foi usada neste smoke test.

## Operação do release

O release usa um worktree isolado em `/root/ai-support-releases/181da55`, também acessível por `/root/ai-support-releases/current`. O checkout antigo foi preservado com suas alterações locais. O projeto Compose continua sendo `ai-support-widget`, com os mesmos volumes de banco e Redis.

O arquivo privado de ambiente está em `/root/ops-backups/2026-09-14-security-181da55/release.env`, com permissão 0600. Os arquivos `.env` e `.env.prod` do release apontam para ele. Não execute a versão antiga do Compose a partir do checkout anterior para reiniciar esta publicação.

```sh
cd /root/ai-support-releases/current
docker compose -p ai-support-widget -f docker-compose.prod.yml --env-file .env.prod ps
```

O mesmo diretório de backup contém dump do banco anterior à migração, configurações anteriores, referências das imagens, patch das alterações locais preservadas, build e evidências de validação. Ele contém segredos e não deve ser incluído em pacotes de entrega.

## Encerramento da compatibilidade

A compatibilidade antiga foi limitada aos dois tenants existentes, com prazo fixo **`2026-09-21T21:50:33Z`**. O servidor rejeita tokens antigos após esse instante, sem depender de reinício. Essa janela ainda mantém o risco do segredo legado compartilhado entre os tenants permitidos; não representa o isolamento final da migração.

Após receber as evidências de migração de um cliente, remova somente seu ID de `LEGACY_WIDGET_TENANTS` no ambiente privado e recrie o servidor com o Compose do release. Quando retirar o último tenant, esvazie **também** `LEGACY_WIDGET_ACCEPT_UNTIL`, pois a configuração exige os dois campos juntos ou nenhum deles. Não renove o prazo a cada restart.

Preserve `JWT_SECRET` enquanto houver dados antigos criptografados com a chave derivada dele. Sua remoção/rotação exige um procedimento próprio de recriptografia. Nunca distribua `ADMIN_JWT_SECRET`, `WIDGET_JWT_SECRET` ou a chave administrativa aos clientes.

## Entrega e limites

Foram preparados dois pacotes individualizados, com guia HTML/Markdown, adaptadores, ambiente de exemplo, checklist e SDK. Eles não contêm segredos. A migração dos backends e frontends dos clientes ainda precisa ser executada e homologada pelos respectivos times.

As credenciais individuais foram provisionadas e permanecem no ambiente privado do servidor. Não foi autorizada a exportação em texto claro para a estação local. Para a entrega, o operador pode substituir a credencial no painel **Widget integration**, salvá-la diretamente no cofre acordado com o responsável pelo backend e conceder acesso individual. A substituição invalida a credencial anterior e todas as sessões vinculadas; coordene-a com o cliente, especialmente se ele já tiver iniciado a migração.

Esta publicação não implementa roteamento MCP por tenant, token exchange com isolamento completo, conectores ausentes ou retenção integral. O build também reportou seis vulnerabilidades no conjunto instalado de dependências do painel (duas moderadas, duas altas e duas críticas). A saída resumida da instalação não substitui uma análise de exposição; a atualização dessas dependências permanece pendente. Não use este release como certificação de encerramento de todos os achados da nota interna.

Não reverta para uma versão que volte a aceitar assinaturas do widget na administração. Em incidente, preserve a separação de credenciais e aplique uma correção ou suspenda o suporte afetado, mantendo o canal alternativo de atendimento.
