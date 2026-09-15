import { afterEach, describe, it, expect, vi } from 'vitest';
import { getEnv, getEnvSafe, resetEnvCache } from './env.js';
import { hashAdminPassword } from '../modules/admin/admin-password.js';

afterEach(() => { vi.unstubAllEnvs(); resetEnvCache(); });
async function configure() {
  const values = {
    NODE_ENV: 'production', DATABASE_URL: 'postgres://fixture', REDIS_URL: 'redis://fixture',
    JWT_SECRET: 'legacy-fixture-secret-at-least-32-characters',
    ADMIN_JWT_SECRET: 'admin-fixture-secret-at-least-32-characters',
    WIDGET_JWT_SECRET: 'widget-fixture-secret-at-least-32-characters',
    TOKEN_ENCRYPTION_KEY: 'encryption-fixture-independent-32-characters',
    OPENROUTER_API_KEY: 'fixture-only', ADMIN_API_KEY: 'fixture-admin-api-key',
    ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD_HASH: await hashAdminPassword('fixture-password'),
    LEGACY_WIDGET_TENANTS: '', LEGACY_WIDGET_ACCEPT_UNTIL: '',
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
  resetEnvCache();
}
describe('Production signing configuration', () => {
  it('accepts distinct secrets with legacy compatibility disabled', async () => {
    await configure(); expect(getEnv().LEGACY_WIDGET_ACCEPT_UNTIL).toBeUndefined();
  });
  it.each(['JWT_SECRET', 'WIDGET_JWT_SECRET'])('rejects sharing the admin secret with %s', async key => {
    await configure(); vi.stubEnv('ADMIN_JWT_SECRET', process.env[key]!);
    expect(() => getEnvSafe()).toThrow(/distinct/);
  });
  it('rejects missing admin signing configuration instead of falling back', async () => {
    await configure(); vi.stubEnv('ADMIN_JWT_SECRET', '');
    expect(() => getEnvSafe()).toThrow();
  });
  it('requires an independent encryption key', async () => {
    await configure(); vi.stubEnv('TOKEN_ENCRYPTION_KEY', process.env.JWT_SECRET!);
    expect(() => getEnv()).toThrow(/distinct TOKEN_ENCRYPTION_KEY/);
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', ''); expect(() => getEnv()).toThrow();
  });
  it('refuses any attempt to re-enable retired legacy authentication', async () => {
    await configure(); vi.stubEnv('LEGACY_WIDGET_TENANTS', 'ten_old');
    expect(() => getEnv()).toThrow(/retired/);
    vi.stubEnv('LEGACY_WIDGET_ACCEPT_UNTIL', new Date(Date.now() + 8 * 86400_000).toISOString());
    expect(() => getEnv()).toThrow(/retired/);
  });
});
