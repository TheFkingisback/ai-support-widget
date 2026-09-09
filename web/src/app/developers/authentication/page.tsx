import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const backend = `// Backend only. Resolve user from your authenticated application session.
async function requestSupportSession(user) {
  const response = await fetch(process.env.SUPPORT_API_URL + '/api/widget/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.SUPPORT_INTEGRATION_CREDENTIAL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      userEmail: user.email,
      userRoles: user.roles,
      plan: user.plan,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Support session unavailable');
  return response.json(); // { jwt, tenantKey, expiresIn: 900 }
}`;

const refresh = `const bootstrap = await fetchAuthenticatedSupportBootstrap();
const widget = AISupportWidget.init({
  tenantKey: bootstrap.tenantKey,
  jwt: bootstrap.jwt,
  apiUrl: 'https://support-ai.pontes.uk',
  context: bootstrap.context,
  onTokenRefresh: async () => (await fetchAuthenticatedSupportBootstrap()).jwt,
});
// On logout, organization change or unmount:
// widget.destroy();`;

export default function AuthenticationPage() {
  return <div data-testid="authentication-page">
    <PageHeader badge="Security" badgeColor="yellow" title="Authentication"
      description="Your backend identifies the user. A tenant-specific integration credential requests a short-lived widget session from the platform." />
    <section className="mb-12 space-y-4 text-sm leading-relaxed text-gray-300">
      <h2 className="text-xl font-semibold text-white">Provision the integration</h2>
      <p>Create the tenant with name and plan. Open Widget integration in the tenant settings and generate an integration credential. Store it only in your application backend secret store.</p>
      <p>The credential starts with sik_. It cannot administer the platform. Administrative keys and the legacy tsk_ key cannot be used at the session endpoint. The platform does not share its signing secrets with integrators.</p>
      <h2 className="text-xl font-semibold text-white">Request a session</h2>
      <p>Call POST /api/widget/sessions from your backend. Derive userId, userRoles and plan from your own authenticated session. userEmail is optional. Do not accept identity overrides from the browser.</p>
      <CodeBlock code={backend} language="JavaScript" />
      <p>The response contains jwt, tenantKey and expiresIn (900 seconds), with Cache-Control: no-store. Add the authorized context and return that bootstrap to the browser using no-store. Do not send tenantId, role, purpose or expiration in the request: the issuer controls those fields.</p>
    </section>
    <section className="mb-12 space-y-4 text-sm leading-relaxed text-gray-300">
      <h2 className="text-xl font-semibold text-white">Token Refresh</h2>
      <CodeBlock code={refresh} language="JavaScript" />
      <p>fetchAuthenticatedSupportBootstrap is your application endpoint, not a platform route. Handle session failures in your UI. The application must destroy the widget before switching users or organizations. Updating the JWT is only for the same identity.</p>
      <h2 className="text-xl font-semibold text-white">Revocation and isolation</h2>
      <p>Replacing or revoking the integration credential invalidates existing sessions on their next authenticated request. Keep user identifiers stable and unique within the project. Conversation access is authorized by tenant and user on the server.</p>
      <p>The operator must complete the migration and confirm the MCP configuration for your project before enabling an external integration. Existing clients using shared signatures have a separate, explicitly expiring migration window. This is not the onboarding method for a new client.</p>
    </section>
  </div>;
}
