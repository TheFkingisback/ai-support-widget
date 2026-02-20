import Link from 'next/link';

const steps = [
  {
    num: 1,
    title: 'Create Tenant via Admin Dashboard',
    content: `Log in to the Admin Dashboard at /admin/tenants and click "Create Tenant".
Provide your company name, choose a plan (starter, pro, or enterprise),
your API base URL, and a service token for server-to-server auth.`,
  },
  {
    num: 2,
    title: 'Configure JWT Shared Secret',
    content: `In the admin dashboard, find your tenant's JWT secret.
Your backend must sign JWTs for each user with this secret.
The JWT payload must include: tenantId, userId, userEmail, userRoles, plan.`,
  },
  {
    num: 3,
    title: 'Implement 4 Endpoints',
    content: `Your backend must expose these endpoints for the widget to fetch context:
  • GET /support/user-state?userId=X
  • GET /support/user-history?userId=X&windowHours=72
  • GET /support/user-logs?userId=X&windowHours=72
  • GET /support/business-rules
See the Developer Portal for full request/response schemas.`,
  },
  {
    num: 4,
    title: 'Add Widget Script Tag',
    content: `Add the widget SDK to any page where users need support:
<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
Then initialize with AISupportWidget.init({ tenantKey, jwt, theme, position }).`,
  },
  {
    num: 5,
    title: 'Test with Demo Page',
    content: `Visit /demo in the web app to test your widget integration.
Open browser DevTools to verify API calls are succeeding.
Check that the FAB button appears and chat opens correctly.`,
  },
  {
    num: 6,
    title: 'Go Live',
    content: `Once testing passes:
  • Point the widget script to your production CDN
  • Update apiUrl to your production Support Gateway
  • Ensure your 4 endpoints return real data
  • Monitor the Admin Dashboard for case analytics`,
  },
];

export default function IntegrationGuidePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="integration-page">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-400">Integration Guide</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/developers" className="text-gray-400 transition-colors hover:text-white">
              Developer Portal
            </Link>
            <Link href="/" className="text-gray-400 transition-colors hover:text-white">Home</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-8 text-lg text-gray-400">
          Follow these 6 steps to integrate the AI Support Widget into your application.
        </p>

        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-lg border border-gray-800 bg-gray-900 p-6"
              data-testid={`step-${step.num}`}
            >
              <div className="mb-3 flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                  {step.num}
                </span>
                <h2 className="text-xl font-semibold">{step.title}</h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                {step.content}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
