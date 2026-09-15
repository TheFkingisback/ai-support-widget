import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tenantLogin } from './tenant-login';
import { setAdminApiKey } from './api';
vi.mock('./api', () => ({ setAdminApiKey: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
describe('Tenant administration key login', () => {
  it('sets tenant scope only after the server validates the key', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ tenants: [{ id: 'ten_a' }] }), { status: 200 }));
    const key = 'tsk_' + 'a'.repeat(32); await tenantLogin(key);
    expect(setAdminApiKey).toHaveBeenCalledWith(key); expect(sessionStorage.getItem('admin_role')).toBe('tenant_admin');
    expect(sessionStorage.getItem('admin_tenant_id')).toBe('ten_a');
  });
  it('refuses widget credentials, revoked admin keys and ambiguous tenant responses', async () => {
    await expect(tenantLogin('sik_' + 'a'.repeat(32))).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tenants: [{ id: 'a' }, { id: 'b' }] }), { status: 200 }));
    for (let i = 0; i < 2; i++) await expect(tenantLogin('tsk_' + 'a'.repeat(32))).rejects.toThrow();
    expect(setAdminApiKey).not.toHaveBeenCalled(); expect(sessionStorage.getItem('admin_role')).toBeNull();
  });
});
