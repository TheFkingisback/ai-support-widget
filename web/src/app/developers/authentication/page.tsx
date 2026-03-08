import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const nodeJwtCode = `import jwt from 'jsonwebtoken';

function createWidgetToken(user, tenantConfig) {
  const payload = {
    tenantId: tenantConfig.tenantId,   // "ten_xxx"
    userId: user.id,                    // "usr_xxx"
    userEmail: user.email,              // "alice@company.com"
    userRoles: user.roles,              // ["user", "admin"]
    plan: user.plan,                    // "pro"
  };

  return jwt.sign(payload, tenantConfig.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}`;

const pythonJwtCode = `import jwt
from datetime import datetime, timedelta, timezone

def create_widget_token(user, tenant_config):
    payload = {
        "tenantId": tenant_config["tenant_id"],
        "userId": user["id"],
        "userEmail": user["email"],
        "userRoles": user["roles"],
        "plan": user["plan"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }

    return jwt.encode(payload, tenant_config["jwt_secret"], algorithm="HS256")`;

const tokenRefreshCode = `AISupportWidget.init({
  tenantKey: 'ten_your_key',
  jwt: initialToken,
  onTokenRefresh: async () => {
    // Called automatically when the current token expires (401)
    const res = await fetch('/api/support/token', {
      method: 'POST',
      credentials: 'include',
    });
    const { token } = await res.json();
    return token;
  },
});`;

const payloadFields = [
  { field: 'tenantId', type: 'string', desc: 'Your tenant ID (ten_xxx)' },
  { field: 'userId', type: 'string', desc: 'Unique user identifier (usr_xxx)' },
  { field: 'userEmail', type: 'string', desc: 'User email address' },
  { field: 'userRoles', type: 'string[]', desc: 'User roles (e.g., ["user", "admin"])' },
  { field: 'plan', type: 'string', desc: 'User subscription plan (e.g., "pro")' },
  { field: 'iat', type: 'number', desc: 'Issued-at timestamp (auto-set by library)' },
  { field: 'exp', type: 'number', desc: 'Expiration timestamp (recommended: 1 hour)' },
];

export default function AuthenticationPage() {
  return (
    <div data-testid="authentication-page">
      <PageHeader
        badge="Security"
        badgeColor="yellow"
        title="Authentication"
        description="The widget uses JWTs signed by your backend to authenticate users. Your server is the only source of truth for identity."
      />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">How It Works</h2>
        <div className="mb-6 space-y-3 text-sm leading-relaxed text-gray-400">
          <p>1. When you create a tenant, you receive a <strong className="text-gray-200">JWT shared secret</strong>.</p>
          <p>2. Your backend signs a JWT for each user session using this secret.</p>
          <p>3. The widget sends this JWT with every request to the Support Gateway.</p>
          <p>4. The Gateway verifies the signature and extracts user identity — <strong className="text-gray-200">no passwords or API keys touch the browser</strong>.</p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">JWT Payload</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Field</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {payloadFields.map((f) => (
                <tr key={f.field} className="border-b border-gray-800/50 transition-colors hover:bg-gray-900/30">
                  <td className="px-4 py-3 font-mono text-blue-400">{f.field}</td>
                  <td className="px-4 py-3 font-mono text-yellow-400">{f.type}</td>
                  <td className="px-4 py-3 text-gray-300">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Sign a Token — Node.js</h2>
        <CodeBlock code={nodeJwtCode} language="JavaScript" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Sign a Token — Python</h2>
        <CodeBlock code={pythonJwtCode} language="Python" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Token Refresh</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          When a token expires, the widget calls your <code className="text-blue-400">onTokenRefresh</code> callback
          to get a fresh one. This happens transparently — the user never sees a login screen.
        </p>
        <CodeBlock code={tokenRefreshCode} language="JavaScript" />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Security Notes</h2>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
            Always use <code className="text-blue-400">HS256</code> algorithm. The Gateway rejects others.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
            Keep expiration short (1 hour max). Use <code className="text-blue-400">onTokenRefresh</code> for renewal.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
            Never expose the JWT secret in client-side code. Sign tokens server-side only.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
            The <code className="text-blue-400">tenantId</code> in the JWT must match your tenant. Cross-tenant tokens are rejected.
          </li>
        </ul>
      </section>
    </div>
  );
}
