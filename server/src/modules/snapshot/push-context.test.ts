import { describe, it, expect, vi } from 'vitest';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { parsePushContext } from './push-context.js';
import { createSnapshotService } from './snapshot.service.js';
import type { TenantService } from '../admin/tenant.service.js';
import { createMockGatewayService } from '../../tests/mocks/mock-gateway.js';
import { buildApp } from '../../app.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
import type { SnapshotService } from './snapshot.service.js';

const context = () => ({
  userState: { userId: 'usr_a', tenantId: 'ten_a', roles: ['member'], plan: 'pro', featuresEnabled: [],
    entities: [{ type: 'account', status: 'active', metadata: { password: 'short-secret' } }], activeErrors: [], limitsReached: [] },
  userHistory: { windowHours: 72, events: [
    { ts: new Date().toISOString(), event: 'click', page: '/home', elementId: null, intent: null, correlationRequestId: null },
    { ts: '2020-01-01T00:00:00Z', event: 'click', page: '/old', elementId: null, intent: null, correlationRequestId: null },
  ] }, userLogs: { recentRequests: [], jobs: [], errors: [] },
  knowledgePack: { docs: [{ id: 'doc', title: 'Guide', content: 'Do not share Bearer abcdefghijklmnopqrstuvwxyz012345', category: 'guide' }] },
});
describe('Push context and persistence', () => {
  it('requires all source blocks, rejects identity mismatch and malformed arrays', () => {
    expect(() => parsePushContext(undefined, 'ten_a', 'usr_a')).toThrow();
    expect(() => parsePushContext(context(), 'ten_b', 'usr_a')).toThrow('identity');
    expect(() => parsePushContext(context(), 'ten_a', 'usr_b')).toThrow('identity');
    expect(() => parsePushContext({ ...context(), userLogs: null }, 'ten_a', 'usr_a')).toThrow();
    expect(parsePushContext(context(), 'ten_a', 'usr_a').userState.entities[0].metadata.password).toBe('[REDACTED]');
  });
  it('persists only processed context and enforces tenant event/doc budgets', async () => {
    const values = vi.fn().mockResolvedValue(undefined); const where = vi.fn().mockResolvedValue(undefined);
    const tx = { insert: () => ({ values }), update: () => ({ set: () => ({ where }) }) };
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 'cas_a' }] }) }) }),
      transaction: async (fn: (value: typeof tx) => Promise<void>) => fn(tx) } as unknown as PostgresJsDatabase;
    const tenant = { getTenant: vi.fn().mockResolvedValue({ config: { maxContextBytes: 65536, maxEventWindowHours: 24, maxLogLines: 10, maxDocs: 1 } }) } as unknown as TenantService;
    const service = createSnapshotService(db, tenant);
    const snapshot = await service.buildSnapshot('ten_a', 'usr_a', 'cas_a', 'req_a', context());
    expect(snapshot.recentActivity.events).toHaveLength(1);
    expect(snapshot.recentActivity.windowHours).toBe(24);
    expect(snapshot.identity).toMatchObject({ userId: 'usr_a', tenantId: 'ten_a' });
    const saved = JSON.stringify(values.mock.calls);
    expect(saved).not.toContain('short-secret'); expect(saved).not.toContain('abcdefghijklmnopqrstuvwxyz012345');
    expect(values.mock.calls[0][0].bytesTotal).toBeLessThanOrEqual(65536);
  });
  it('rejects before creating a case when preflight fails; never returns fake success on snapshot failure', async () => {
    const gateway = createMockGatewayService();
    const snapshot: SnapshotService = { prepareContext: async (_t, _u, ctx) => parsePushContext(ctx, 'ten_a', 'usr_a'),
      buildSnapshot: vi.fn().mockRejectedValue(new Error('snapshot unavailable')), getSnapshot: vi.fn() };
    const app = await buildApp({ jwtSecret: 'test-only-key', gatewayService: gateway,
      rateLimiter: createInMemoryRateLimiter(), snapshotService: snapshot });
    const token = app.jwt.sign({ purpose: 'widget', tenantId: 'ten_a', userId: 'usr_a' });
    const call = (ctx?: unknown) => app.inject({ method: 'POST', url: '/api/cases', headers: { authorization: `Bearer ${token}` }, payload: { message: 'Help', context: ctx } });
    expect((await call()).statusCode).toBe(400); expect(gateway._cases).toHaveLength(0);
    expect((await call(context())).statusCode).toBe(500);
    vi.mocked(snapshot.buildSnapshot).mockResolvedValue({ meta: { snapshotId: 'scs_persisted' } } as Awaited<ReturnType<SnapshotService['buildSnapshot']>>);
    const created = await call(context());
    expect(created.statusCode).toBe(200);
    expect(created.json().snapshot.id).toBe('scs_persisted');
    expect(created.json().case.snapshotId).toBe('scs_persisted');
    await app.close();
  });
});
