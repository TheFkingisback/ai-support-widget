# Aceite técnico das consultas TrackShare

15/09/2026, 15:29:53 UTC. Cliente corrigido executado em processo isolado no servidor do suporte contra `https://trackshare.pontes.uk/mcp`. Duas contas, carros, arquivos, sessões e voltas sintéticos; fixtures removidas ao término.

16 verificações aprovadas:

- Catálogo exatamente com as sete ferramentas de leitura.
- Resultado positivo para cada uma: uploads, detalhe de arquivo, sessões, voltas, carros, downloads e diagnóstico de erros.
- Arquivo e sessão do segundo usuário negados ao primeiro.
- Limite de consulta inválido rejeitado.
- Tenant e credencial inválidos rejeitados.
- `get_matching_sessions`, `reassign_session_car` e `execute_action` bloqueados no cliente de leitura.

A primeira tentativa encontrou uma corrida no encerramento do stream do Node 20. Corrigida com ponte de stream cancelável, limite de bytes e propagação de erro; testes de regressão locais aprovados. Falhas e indisponibilidade são cobertas por testes locais com mocks, sem parar o TrackShare.

Este resultado certifica o caminho cliente MCP → TrackShare com dados sintéticos. **Ainda não certifica as sete consultas através do chat publicado.** Essa etapa segue a publicação da correção, atualmente pendente de autorização do envio. O conector foi temporariamente desabilitado para evitar a falha conhecida no runtime antigo.

Escrita continua desligada. Sua homologação exige a implementação do TrackShare descrita no contrato 1.1.
