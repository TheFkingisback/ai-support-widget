import Link from 'next/link';
import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const widgetSnippet = `<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
<script>
  AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: await getJwtFromYourBackend(),
    theme: 'light',
    position: 'bottom-right',
  });
</script>`;

const steps = [
  {
    num: 1,
    title: 'Create a Tenant',
    desc: 'Log in to the Admin Dashboard and create a tenant. You\'ll receive a tenant key (ten_xxx) and a JWT shared secret.',
    link: { href: '/admin', label: 'Open Admin Dashboard' },
  },
  {
    num: 2,
    title: 'Sign JWTs on Your Backend',
    desc: 'Your backend must sign a JWT for each user session using the shared secret. The JWT payload includes tenantId, userId, userEmail, userRoles, and plan.',
    link: { href: '/developers/authentication', label: 'Authentication Guide' },
  },
  {
    num: 3,
    title: 'Implement 4 Endpoints',
    desc: 'Expose 4 GET endpoints that return user state, history, logs, and business rules. The widget backend calls these to build context.',
    link: { href: '/developers/api-reference', label: 'API Reference' },
  },
  {
    num: 4,
    title: 'Embed the Widget',
    desc: 'Add the widget script to your page and initialize it with your tenant key and JWT. That\'s it — your users now have AI-powered support.',
    link: { href: '/developers/widget-sdk', label: 'Widget SDK Docs' },
  },
];

export default function QuickStartPage() {
  return (
    <div data-testid="quick-start-page">
      <PageHeader
        badge="Getting Started"
        badgeColor="green"
        title="Quick Start"
        description="Get AI-powered support running in your app in under 10 minutes. Four steps, no magic."
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
          Here&apos;s everything you need on the frontend — two script tags:
        </p>
        <CodeBlock code={widgetSnippet} language="HTML" />
      </div>
    </div>
  );
}
