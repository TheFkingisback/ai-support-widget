import Link from 'next/link';
import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const widgetSnippet = `<script src="https://support-ai.pontes.uk/widget.v0.2.0.js"></script>
<script type="module">
  // Your application endpoint authenticates the user and builds context.
  const res = await fetch('/api/support/bootstrap', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error('Support unavailable');
  const data = await res.json();
  const widget = AISupportWidget.init({
    tenantKey: data.tenantKey, jwt: data.jwt, context: data.context,
    apiUrl: 'https://support-ai.pontes.uk', theme: 'light', position: 'bottom-right',
  });
  // Add onTokenRefresh using your backend; call destroy() at logout.
</script>`;

const steps = [
  { num: 1, title: 'Create a Tenant', desc: 'Choose a name and plan. Open Widget integration in the tenant settings and generate a backend integration credential.', link: { href: '/admin', label: 'Open Admin Dashboard' } },
  { num: 2, title: 'Request Widget Sessions', desc: 'Your authenticated backend exchanges its tenant-specific credential for a 15-minute user session. Keep the credential on the server.', link: { href: '/developers/authentication', label: 'Authentication Guide' } },
  { num: 3, title: 'Prepare Authorized Context', desc: 'Build userState, userHistory, userLogs and reviewed knowledge documents in your backend. Return them with the widget session. Separate public pull endpoints are not required for this flow.', link: { href: '/developers/types', label: 'Context Types' } },
  { num: 4, title: 'Embed and Validate', desc: 'Load the pinned SDK, configure renewal and logout, test isolation and confirm the project MCP configuration with the operator before release.', link: { href: '/developers/widget-sdk', label: 'Widget SDK Docs' } },
];

export default function QuickStartPage() {
  return (
    <div data-testid="quick-start-page">
      <PageHeader
        badge="Getting Started"
        badgeColor="green"
        title="Quick Start"
        description="Prepare the tenant, session, context and widget, then validate the integration before release."
      />

      <div className="mb-10 space-y-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="group relative rounded-xl border border-gray-800 bg-gray-900/30 p-6 transition-all hover:border-gray-700"
          >
            <div className="flex items-start gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20">
                {step.num}
              </div>
              <div className="min-w-0">
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">{step.desc}</p>
                <Link
                  href={step.link.href}
                  className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  {step.link.label} &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Minimal Example</h2>
        <p className="mb-4 text-sm text-gray-400">
          After your backend bootstrap is implemented — two script tags:
        </p>
        <CodeBlock code={widgetSnippet} language="HTML" />
      </div>
    </div>
  );
}
