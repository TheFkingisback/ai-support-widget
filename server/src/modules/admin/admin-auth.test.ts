import Fastify, { type FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createAdminAuth, createLoginHandler } from './admin-auth.js';
import { hashAdminPassword, verifyAdminPassword } from './admin-password.js';
import { AppError } from '../../shared/errors.js';
import { setLogLevel } from '../../shared/logger.js';

const email = 'admin@example.com';
const password = ' test-password-123! ';
const jwtSecret = 'test-secret-at-least-thirty-two-characters';
const superAdminKey = 'test-admin-integration-key';
let hash: string;
let app: FastifyInstance;

beforeAll(async () => {
  setLogLevel('off');
  hash = await hashAdminPassword(password);
});

beforeEach(async () => {
  app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    reply.code(error instanceof AppError ? error.statusCode : 500).send({ message: error.message });
  });
  const opts = { superAdminKey, jwtSecret, adminEmail: email, adminPasswordHash: hash };
  app.post('/api/admin/login', createLoginHandler(opts));
  app.get('/protected', { preHandler: createAdminAuth(opts) }, async (request) => request.adminPayload);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await app.close();
});

describe('Administrator email/password authentication', () => {
  it('signs in, normalizes the email and issues an eight-hour token that accesses the API', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { email: ' ADMIN@EXAMPLE.COM ', password } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const { token, role } = response.json();
    expect(role).toBe('super_admin');
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    expect(decoded.exp! - decoded.iat!).toBe(8 * 60 * 60);
    expect(decoded).not.toHaveProperty('password');
    const protectedResponse = await app.inject({ url: '/protected', headers: { authorization: `Bearer ${token}` } });
    expect(protectedResponse.statusCode).toBe(200);
    expect(protectedResponse.json().role).toBe('super_admin');
  });

  it.each([
    { email, password: 'incorrect' },
    { email: 'unknown@example.com', password },
    { email, password: password.trim() },
    { email, password: '' },
    { email },
    { email, password: 123 },
    { email: [], password },
    { apiKey: superAdminKey },
    { apiKey: 'tsk_legacy-key' },
    { email, password, apiKey: superAdminKey },
    { email, password: 'x'.repeat(1025) },
  ])('rejects invalid credentials without disclosing account details (%#)', async (payload) => {
    const response = await app.inject({ method: 'POST', url: '/api/admin/login', payload });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ message: 'Invalid email or password' });
  });

  it('rejects missing credential configuration', async () => {
    app.post('/unconfigured', createLoginHandler({ superAdminKey, jwtSecret }));
    const response = await app.inject({ method: 'POST', url: '/unconfigured', payload: { email, password } });
    expect(response.statusCode).toBe(403);
  });

  it('limits attempts across source IPs and permits login after the window expires', async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    for (let i = 0; i < 10; i++) {
      await app.inject({ method: 'POST', url: '/api/admin/login', payload: {} });
    }
    const response = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { email, password }, remoteAddress: '192.0.2.2' });
    expect(response.statusCode).toBe(429);
    clock.mockReturnValue(now + 60_001);
    const retry = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { email, password } });
    expect(retry.statusCode).toBe(200);
  });

  it('keeps the integration key usable directly on the API', async () => {
    const response = await app.inject({ url: '/protected', headers: { authorization: `Bearer ${superAdminKey}` } });
    expect(response.statusCode).toBe(200);
  });

  it('rejects empty API keys and expired or tampered tokens', async () => {
    app.get('/empty-key', { preHandler: createAdminAuth('') }, async () => ({ ok: true }));
    const empty = await app.inject({ url: '/empty-key', headers: { authorization: 'Bearer ' } });
    expect(empty.statusCode).toBe(403);
    for (const token of [jwt.sign({ role: 'super_admin' }, jwtSecret, { expiresIn: -1 }), jwt.sign({ role: 'super_admin' }, 'wrong-secret')]) {
      const response = await app.inject({ url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(403);
    }
  });

  it('uses random salts and rejects malformed password hashes', async () => {
    expect(await hashAdminPassword(password)).not.toBe(hash);
    expect(await verifyAdminPassword(password, 'broken-hash')).toBe(false);
  });
});
