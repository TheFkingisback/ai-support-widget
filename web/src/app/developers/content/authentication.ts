import type { Article } from './model';
export const article: Article = {
  slug: "authentication",
  title: "Autenticação",
  category: "PRIMEIROS PASSOS",
  summary: "Uma credencial no backend. Uma sessão temporária no widget.",
  keywords: "jwt sik chave token expiração renovação",
  sections: [
    {"id": "credentials", "title": "Três credenciais, três funções", "text": ["Cada credencial tem uma finalidade. Nunca distribua as chaves de assinatura da plataforma."], "rows": [["Credencial", "Uso", "Local"], ["sik_", "Emitir sessões do widget", "Ambiente privado do backend"], ["tsk_", "Configuração administrativa do próprio tenant", "Painel self-service"], ["Credencial MCP", "Autenticar chamadas ao seu conector", "Configuração MCP e backend provedor"]]},
    {"id": "issue", "title": "Emissão no backend", "text": ["POST /api/widget/sessions aceita userId, userEmail (email ou vazio), userRoles e plan. Derive esses valores da sessão e banco do seu aplicativo. Envie somente esses quatro campos."], "code": "# Somente no backend. Use variáveis do ambiente privado.\ncurl --fail-with-body \\\n  https://support-ai.pontes.uk/api/widget/sessions \\\n  -H \"Authorization: Bearer $SUPPORT_INTEGRATION_CREDENTIAL\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"userId\":\"usr_exemplo\",\"userEmail\":\"\",\"userRoles\":[\"member\"],\"plan\":\"standard\"}' ", "language": "cURL", "note": "userId: 1–200 caracteres. Até 30 papéis de 1–80 caracteres. plan: 1–80 caracteres. userEmail: até 254 caracteres."},
    {"id": "response", "title": "Sessão de 15 minutos", "text": ["O emissor devolve tenantKey, jwt e expiresIn: 900. Confira o tenant esperado antes de devolver ao navegador. O adaptador de referência limita resposta, timeout e redirects."], "code": "{ \"jwt\": \"<JWT>\", \"tenantKey\": \"ten_seu_projeto\", \"expiresIn\": 900 }", "language": "JSON", "links": [{"label": "Baixar adaptador Node.js", "href": "/integration-v3/backend-session.mjs"}]},
    {"id": "identity", "title": "Identidade, renovação e revogação", "text": ["Preserve um userId estável por pessoa e vínculo autorizado. Email, papel, dispositivo e timestamp não são boas chaves de identidade. Todas as operações da conversa exigem o mesmo tenant e proprietário.", "Após 401, o SDK chama onTokenRefresh e repete uma vez. Destrua a instância antes de mudar pessoa, organização ou papel. O logout local não revoga imediatamente um JWT já copiado: ele pode durar até 15 minutos.", "Substituir ou revogar sik_ invalida as sessões ligadas à credencial anterior na próxima chamada. Coordene a rotação. Assinaturas legadas com segredo compartilhado não são aceitas."]},
  ],
};
