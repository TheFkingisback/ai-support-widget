import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const basicSetup = `<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
<script>
  AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: yourUserJwt,
    theme: 'light',
    position: 'bottom-right',
    onTokenRefresh: async () => {
      const res = await fetch('/api/support/token', { credentials: 'include' });
      const { token } = await res.json();
      return token;
    },
  });
</script>`;

const spaExample = `// React / Vue / Angular — initialize after mount
useEffect(() => {
  const widget = AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: user.supportToken,
    theme: prefersDark ? 'dark' : 'light',
    position: 'bottom-right',
  });

  return () => widget.destroy();
}, [user.supportToken]);`;

const configOptions = [
  { name: 'tenantKey', type: 'string', required: true, desc: 'Your tenant ID (ten_xxx). Get this from the Admin Dashboard.' },
  { name: 'jwt', type: 'string', required: true, desc: 'JWT signed by your backend. See Authentication guide.' },
  { name: 'theme', type: "'light' | 'dark'", required: false, desc: 'Widget color theme. Default: light.' },
  { name: 'position', type: "'bottom-right' | 'bottom-left'", required: false, desc: 'FAB button position on screen. Default: bottom-right.' },
  { name: 'onTokenRefresh', type: '() => Promise<string>', required: false, desc: 'Called when JWT expires (401). Return a fresh token string.' },
];

export default function WidgetSdkPage() {
  return (
    <div data-testid="widget-sdk-page">
      <PageHeader
        badge="Frontend"
        badgeColor="purple"
        title="Widget SDK"
        description="A zero-dependency, <50KB JavaScript SDK that embeds AI support into any web page. Shadow DOM ensures style isolation."
      />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Basic Setup</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          Add two script tags to any page. The widget creates a floating action button (FAB)
          that opens an AI-powered chat interface.
        </p>
        <CodeBlock code={basicSetup} language="HTML" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Configuration</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Option</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Req</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {configOptions.map((opt) => (
                <tr key={opt.name} className="border-b border-gray-800/50 transition-colors hover:bg-gray-900/30">
                  <td className="px-4 py-3 font-mono text-blue-400">{opt.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-yellow-400">{opt.type}</td>
                  <td className="px-4 py-3">
                    {opt.required ? (
                      <span className="text-xs font-medium text-red-400">Yes</span>
                    ) : (
                      <span className="text-xs text-gray-600">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{opt.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">SPA Frameworks</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          For React, Vue, or Angular apps, initialize the widget after the component mounts
          and destroy it on unmount to avoid memory leaks.
        </p>
        <CodeBlock code={spaExample} language="JavaScript" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            title="Shadow DOM"
            desc="Widget styles are fully isolated. Your CSS won't break the widget, and vice versa."
          />
          <FeatureCard
            title="Zero Dependencies"
            desc="Pure TypeScript, no React/Vue/jQuery required. Works with any framework or vanilla JS."
          />
          <FeatureCard
            title="Single JS File"
            desc="Builds to <50KB gzipped. One script tag is all you need — no CSS imports."
          />
          <FeatureCard
            title="Token Refresh"
            desc="Automatic JWT renewal via onTokenRefresh callback. Users never see auth errors."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Widget Lifecycle</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0d1117] p-5">
          <pre className="text-xs leading-relaxed text-gray-400 sm:text-sm">
{`init()                    // Mount widget into DOM (Shadow DOM)
  ├─ Create FAB button    // Floating action button
  ├─ Attach event listeners
  └─ Ready

User clicks FAB
  ├─ Open chat panel
  ├─ POST /api/cases      // Create support case
  └─ Receive AI response  // With evidence + suggested actions

onTokenRefresh()          // Called on 401 (token expired)
  └─ Retry failed request

destroy()                 // Unmount widget, clean up listeners`}
          </pre>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <h3 className="mb-1.5 text-sm font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
    </div>
  );
}
