'use client';
import { L } from '@/lib/localization';
import { McpSection } from './mcp-section';
import { IntegrationCredentialSection } from './integration-credential-section';
import { getAdminTenantId } from '@/lib/api';
export function TenantSelfService() {
  const tenantId = getAdminTenantId();
  return <div className="space-y-6">
    <h1 className="text-xl font-semibold"><L>{"Integration settings"}</L></h1>
    <p><L>{"Configure your application connection and the operations available through support."}</L></p>
    <IntegrationCredentialSection key={tenantId} tenantId={tenantId} />
    <McpSection key={`mcp-${tenantId}`} tenantId={tenantId} />
  </div>;
}
