import type {
  Tenant, AnalyticsSummary, AuditEntry, Case,
  CreateTenantInput, UpdateTenantInput, OpenRouterModel, CostSummary,
  SessionSummary, SessionDetail,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let token = '';

function loadStoredToken(): void {
  if (!token && typeof window !== 'undefined') {
    token = sessionStorage.getItem('admin_token') ?? '';
  }
}

export function getAdminApiKey(): string {
  loadStoredToken();
  return token;
}

export function setAdminApiKey(key: string): void {
  token = key;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('admin_token', key);
  }
}

export function clearAdminApiKey(): void {
  token = '';
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_role');
    sessionStorage.removeItem('admin_tenant_id');
  }
}

export function getAdminRole(): string {
  if (typeof window !== 'undefined') return sessionStorage.getItem('admin_role') ?? '';
  return '';
}

export function getAdminTenantId(): string {
  if (typeof window !== 'undefined') return sessionStorage.getItem('admin_tenant_id') ?? '';
  return '';
}

export interface LoginResult {
  token: string;
  role: 'super_admin' | 'tenant_admin';
  tenantId?: string;
}

export async function adminLogin(apiKey: string, tenantId?: string): Promise<LoginResult> {
  const body: Record<string, string> = { apiKey };
  if (tenantId) body.tenantId = tenantId;

  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Login failed: ${res.status}`);
  }

  const result = await res.json() as LoginResult;
  setAdminApiKey(result.token);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('admin_role', result.role);
    if (result.tenantId) sessionStorage.setItem('admin_tenant_id', result.tenantId);
  }
  return result;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  loadStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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

export interface CreateTenantResult {
  tenant: Tenant;
  adminApiKey: string;
}

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  return request<CreateTenantResult>('POST', '/api/admin/tenants', input);
}

export async function resetTenantKey(tenantId: string): Promise<{ adminApiKey: string }> {
  return request<{ adminApiKey: string }>('POST', `/api/admin/tenants/${tenantId}/reset-key`);
}

export async function deleteTenant(id: string): Promise<void> {
  await request<{ ok: true }>('DELETE', `/api/admin/tenants/${id}`);
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
