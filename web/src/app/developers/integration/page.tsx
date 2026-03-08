import Link from 'next/link';
import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';
import {
  Building2, Key, Server, Code2, TestTube, Rocket,
} from 'lucide-react';

const endpointList = `GET /support/user-state?userId=X
GET /support/user-history?userId=X&windowHours=72
GET /support/user-logs?userId=X&windowHours=72
GET /support/business-rules`;

const widgetInit = `<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
<script>
  AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: yourUserJwt,
    theme: 'light',
    position: 'bottom-right',
  });
</script>`;

const steps = [
  {
    icon: Building2,
    title: 'Create Tenant',
    desc: 'Log in to the Admin Dashboard and click "Create Tenant". Provide your company name, plan, API base URL, and a service token for server-to-server authentication.',
    color: 'from-blue-500 to-cyan-500',
    link: { href: '/admin/tenants', label: 'Admin Dashboard' },
  },
  {
    icon: Key,
    title: 'Configure JWT Secret',
    desc: 'Copy the JWT shared secret from your tenant settings. Your backend must sign JWTs for each user session with this secret using HS256.',
    color: 'from-yellow-500 to-amber-500',
    link: { href: '/developers/authentication', label: 'Authentication Guide' },
  },
  {
    icon: Server,
    title: 'Implement 4 Endpoints',
    desc: 'Your backend must expose 4 GET endpoints that the Support Gateway calls server-to-server to build context snapshots:',
    color: 'from-green-500 to-emerald-500',
    link: { href: '/developers/api-reference#client', label: 'Endpoint Docs' },
    code: endpointList,
  },
  {
    icon: Code2,
    title: 'Add Widget Script',
    desc: 'Add the widget SDK to any page where users need support. Two script tags and you\'re live:',
    color: 'from-purple-500 to-violet-500',
    link: { href: '/developers/widget-sdk', label: 'Widget SDK Docs' },
    code: widgetInit,
  },
  {
    icon: TestTube,
    title: 'Test with Demo Page',
    desc: 'Visit the /demo page to test your widget integration. Open browser DevTools to verify API calls are succeeding and that the chat opens correctly.',
    color: 'from-pink-500 to-rose-500',
    link: { href: '/demo', label: 'Open Demo' },
  },
  {
    icon: Rocket,
    title: 'Go Live',
    desc: 'Point the widget script to your production CDN, update the API URL to your production gateway, ensure your 4 endpoints return real data, and monitor analytics in the Admin Dashboard.',
    color: 'from-orange-500 to-red-500',
    link: { href: '/admin', label: 'View Analytics' },
  },
];

export default function IntegrationGuidePage() {
  return (
    <div data-testid="integration-page">
      <PageHeader
        badge="Step by Step"
        badgeColor="green"
        title="Integration Guide"
        description="Follow these 6 steps to integrate AI-powered support into your application. Each step links to detailed documentation."
      />

      <div className="space-y-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/30 transition-all hover:border-gray-700"
              data-testid={`step-${i + 1}`}
            >
              <div className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="mb-0.5 text-xs font-medium text-gray-500">Step {i + 1}</div>
                    <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">{step.desc}</p>
                <Link
                  href={step.link.href}
                  className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  {step.link.label} &rarr;
                </Link>
              </div>
              {step.code && (
                <div className="border-t border-gray-800">
                  <CodeBlock code={step.code} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
