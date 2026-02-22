import type {
  Tenant, AnalyticsSummary, AuditEntry, Case,
  CreateTenantInput, UpdateTenantInput, OpenRouterModel, CostSummary,
  SessionSummary, SessionDetail,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

export function setAdminApiKey(key: string): void {
  apiKey = key;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function listTenants(): Promise<Tenant[]> {
  const data = await request<{ tenants: Tenant[] }>('GET', '/api/admin/tenants');
  return data.tenants;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const data = await request<{ tenant: Tenant }>('POST', '/api/admin/tenants', input);
  return data.tenant;
}

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const data = await request<{ tenant: Tenant }>('PATCH', `/api/admin/tenants/${id}`, input);
  return data.tenant;
}

export async function getAnalytics(tenantId: string): Promise<AnalyticsSummary> {
  const data = await request<{ analytics: AnalyticsSummary }>(
    'GET', `/api/admin/tenants/${tenantId}/analytics`,
  );
  return data.analytics;
}

export async function getCases(tenantId: string): Promise<Case[]> {
  const data = await request<{ cases: Case[] }>(
    'GET', `/api/admin/tenants/${tenantId}/cases`,
  );
  return data.cases;
}

export async function getAuditLog(
  tenantId: string, page = 1, pageSize = 20,
): Promise<{ entries: AuditEntry[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  return request('GET', `/api/admin/tenants/${tenantId}/audit?page=${page}&pageSize=${pageSize}`);
}

export async function listModels(): Promise<OpenRouterModel[]> {
  const data = await request<{ models: OpenRouterModel[] }>('GET', '/api/admin/models');
  return data.models;
}

export async function getCosts(tenantId: string, month?: string): Promise<CostSummary> {
  const qs = month ? `?month=${month}` : '';
  const data = await request<{ costs: CostSummary }>(
    'GET', `/api/admin/tenants/${tenantId}/costs${qs}`,
  );
  return data.costs;
}

export async function getSessions(): Promise<SessionSummary[]> {
  const data = await request<{ sessions: SessionSummary[] }>('GET', '/api/admin/sessions');
  return data.sessions;
}

export async function getSessionDetail(caseId: string): Promise<SessionDetail> {
  return request<SessionDetail>('GET', `/api/admin/sessions/${caseId}`);
}

export async function purgeSessions(olderThanDays: number): Promise<{ purged: number; cutoff: string }> {
  return request('DELETE', '/api/admin/sessions/purge', { olderThanDays });
}
