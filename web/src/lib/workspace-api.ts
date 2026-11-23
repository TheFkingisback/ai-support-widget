export type Environment = 'staging' | 'production';
export type WorkspaceOrigin = { origin: string; challenge: string; verified_at: string | null };
export type WorkspaceEnvironment = { tenantId: string; hasCredential: boolean; hasAnswer: boolean; origins: WorkspaceOrigin[] };
export interface Workspace {
  name: string;
  email: string;
  role: 'owner' | 'developer' | 'support';
  sandbox: { hasAnswer: boolean };
  staging: WorkspaceEnvironment;
  production: WorkspaceEnvironment;
}
export type SandboxSession = { jwt: string; tenantKey: string; userId: string; expiresIn: number };

async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`/api/workspace${path}`, {
    method, cache: 'no-store', credentials: 'same-origin',
    ...(data !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? 'The workspace service is unavailable');
  return body as T;
}

export const workspaceApi = {
  availability: () => api<{ available: boolean }>('/availability'),
  begin: (email: string, name?: string) => api('/begin', 'POST', name ? { email, name } : { email }),
  confirm: (token: string) => api('/confirm', 'POST', { token }),
  get: () => api<Workspace>(''),
  logout: () => api('/logout', 'POST'),
  sandbox: () => api<SandboxSession>('/sandbox/session', 'POST'),
  generate: (env: Environment) => api<{ credential: string }>(`/environments/${env}/credential`, 'POST'),
  revoke: (env: Environment) => api(`/environments/${env}/credential`, 'DELETE'),
  origin: (env: Environment, origin: string, action: 'add' | 'verify' | 'remove') => {
    const path = `/environments/${env}/origins${action === 'verify' ? '/verify' : ''}`;
    return api<{ origins: WorkspaceOrigin[] }>(path, action === 'remove' ? 'DELETE' : 'POST', { origin });
  },
};
