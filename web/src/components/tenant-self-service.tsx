'use client';
import { McpSection } from './mcp-section';
import { IntegrationCredentialSection } from './integration-credential-section';
import { getAdminTenantId } from '@/lib/api';
export function TenantSelfService() {
  const tenantId = getAdminTenantId();
  return <div className="space-y-6">
    <h1 className="text-xl font-semibold">Integration settings</h1>
    <p>Configure your application connection and the operations available through support.</p>
    <IntegrationCredentialSection key={tenantId} tenantId={tenantId} />
    <McpSection key={`mcp-${tenantId}`} tenantId={tenantId} />
  </div>;
}
