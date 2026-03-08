import { PageHeader } from '../components/page-header';
import { GatewayEndpoints } from './gateway-endpoints';
import { ClientEndpoints } from './client-endpoints';

export default function ApiReferencePage() {
  return (
    <div data-testid="api-reference-page">
      <PageHeader
        badge="Reference"
        badgeColor="blue"
        title="API Reference"
        description="Complete reference for the Support Gateway API and the 4 endpoints your host application must implement."
      />

      <div className="mb-6 flex gap-2">
        <a href="#gateway" className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20">
          Gateway API
        </a>
        <a href="#client" className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20">
          Client Endpoints
        </a>
      </div>

      <section id="gateway" className="mb-16">
        <h2 className="mb-2 text-2xl font-bold text-white">Gateway API</h2>
        <p className="mb-8 text-sm text-gray-400">
          These endpoints are served by the Support Gateway. The widget calls them automatically.
          You can also call them directly for custom integrations.
        </p>
        <GatewayEndpoints />
      </section>

      <section id="client">
        <h2 className="mb-2 text-2xl font-bold text-white">Client Integration Endpoints</h2>
        <p className="mb-8 text-sm text-gray-400">
          Your host application must implement these 4 endpoints. The Support Gateway calls them
          server-to-server to build the Support Context Snapshot for each case.
        </p>
        <ClientEndpoints />
      </section>
    </div>
  );
}
