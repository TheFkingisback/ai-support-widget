import { setAdminApiKey } from './api';
/** Validate the existing tenant administration key; never use the widget or MCP credential. */
export async function tenantLogin(key: string): Promise<void> {
  if (!/^tsk_[A-Za-z0-9_-]{32}$/.test(key)) throw new Error('Invalid tenant administration key');
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const response = await fetch(`${base}/api/admin/tenants`, { cache: 'no-store', headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error('Invalid tenant administration key');
  const data = await response.json();
  if (!Array.isArray(data.tenants) || data.tenants.length !== 1 || typeof data.tenants[0].id !== 'string') throw new Error('Invalid tenant response');
  setAdminApiKey(key); sessionStorage.setItem('admin_role', 'tenant_admin');
  sessionStorage.setItem('admin_tenant_id', data.tenants[0].id);
}
