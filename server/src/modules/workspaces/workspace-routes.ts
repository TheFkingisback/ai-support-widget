import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { resolveTxt } from 'node:dns/promises';
import { z } from 'zod';
import { AppError, ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';
import { createIntegrationCredential, issueWidgetSession } from '../sessions/session.routes.js';
import type { RateLimiter } from '../gateway/rate-limiter.js';
import type { SessionStore } from '../sessions/session.store.js';
import type { WorkspaceMail } from './workspace-mail.js';
import { hash, secret, sessionDuration, type WorkspaceStore } from './workspace-store.js';
import { registerWorkspaceOperations } from './workspace-operations.js';
import { defaultLocale, matchAcceptLanguage, matchLocale } from '@ai-support/shared/locales';
import { messagesFor } from '@ai-support/shared/messages';
import type { createMcpSettings } from '../orchestrator/mcp.routes.js';
import type { createSuggestionStore } from './suggestions.js';

const prefix = '/api/workspace';
const cookie = '__Host-support_workspace';
const suffix = 'Path=/; HttpOnly; Secure; SameSite=Lax';
export const localeSchema = z.string().max(100).refine(value => Boolean(matchLocale(value)), 'Unsupported locale').transform(value => matchLocale(value)!);
const authBody = z.object({ email: z.string().trim().email().max(254).toLowerCase(), name: z.string().trim().min(1).max(100).optional(),
  locale: localeSchema.optional() }).strict();
const confirmBody = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
const environment = z.enum(['staging', 'production']);
const originBody = z.object({ origin: z.string().trim().max(255).url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && value.replace(/\/$/, '') === url.origin && url.hostname.includes('.');
  } catch { return false; }
}, 'Enter an exact HTTPS browser origin') }).strict();

export interface WorkspaceOptions {
  rateLimiter?: RateLimiter;
  store: WorkspaceStore;
  sessions: SessionStore;
  publicOrigin: string;
  widgetSecret: string;
  mail?: WorkspaceMail;
  mcp?: ReturnType<typeof createMcpSettings>;
  suggestions?: ReturnType<typeof createSuggestionStore>;
  lookup?: typeof resolveTxt;
}

function readCookie(request: FastifyRequest) {
  return request.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${cookie}=`))?.slice(cookie.length + 1) ?? '';
}

export async function registerWorkspaceRoutes(app: FastifyInstance, options: WorkspaceOptions) {
  const { store, sessions, publicOrigin, mail, widgetSecret, lookup = resolveTxt } = options;
  await app.register(async api => {
    api.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      if (request.method !== 'GET' && request.headers.origin !== publicOrigin) throw new ForbiddenError('Unexpected request origin');
    });
    async function account(request: FastifyRequest) {
      const token = readCookie(request);
      if (!token) throw new UnauthorizedError('Sign in to your workspace');
      const current = await store.session(token);
      if (!current) throw new UnauthorizedError('Sign in to your workspace');
      return current;
    }
    function environmentTenant(request: FastifyRequest, current: Awaited<ReturnType<typeof account>>) {
      if (current.role === 'support') throw new ForbiddenError('This role cannot change the installation');
      const env = validateBody(environment, (request.params as { env: string }).env);
      return env === 'staging' ? current.staging_id : current.production_id;
    }
    async function manage(request: FastifyRequest) { return environmentTenant(request, await account(request)); }
    function setSession(reply: FastifyReply, session: string, ttl: number) {
      reply.header('Set-Cookie', `${cookie}=${session}; ${suffix}; Max-Age=${ttl}`);
    }

    api.get('/availability', async () => ({ available: Boolean(mail) }));
    api.post('/begin', async (request, reply) => {
      if (!mail) throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'Email sign-in is currently unavailable');
      const data = validateBody(authBody, request.body);
      await options.rateLimiter?.check(`mail-ip:${request.ip}`, 20, 60_000, request.id);
      await options.rateLimiter?.check(`mail-to:${hash(data.email)}`, 1, 60_000, request.id);
      const token = secret();
      const locale = data.locale ?? matchAcceptLanguage(request.headers['accept-language']) ?? defaultLocale;
      await store.saveLink(token, data.email, data.name ?? messagesFor(locale).workspaceDefault, new Date(Date.now() + 20 * 60_000), undefined, locale);
      try {
        await mail.send(data.email, `${publicOrigin}/signup?lang=${locale}#confirm=${token}`, locale);
      } catch {
        await store.deleteLink(token);
        throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'The sign-in email could not be sent. Try again shortly.');
      }
      return reply.code(202).send({ ok: true });
    });
    api.post('/confirm', async (request, reply) => {
      const { token } = validateBody(confirmBody, request.body);
      const { session } = await store.consumeLink(token, request.id);
      setSession(reply, session, sessionDuration);
      return { ok: true };
    });
    api.post('/logout', async (request, reply) => {
      await store.signOut(readCookie(request));
      setSession(reply, '', 0);
      return { ok: true };
    });
    api.get('/', async request => {
      const current = await account(request);
      const [staging, production, sandbox] = await Promise.all([
        store.integrationStatus(current.staging_id), store.integrationStatus(current.production_id), store.integrationStatus(current.sandbox_id),
      ]);
      return { name: current.name, email: current.email, role: current.role, locale: current.locale, sandbox: { hasAnswer: sandbox.hasAnswer },
        staging: { ...staging, tenantId: current.staging_id }, production: { ...production, tenantId: current.production_id } };
    });
    api.put('/locale', async request => {
      const current = await account(request);
      const { locale } = validateBody(z.object({ locale: localeSchema }).strict(), request.body);
      await store.setLocale(current.email, current.id, locale);
      return { ok: true };
    });
    api.post('/sandbox/session', async request => {
      const current = await account(request);
      const record = await sessions.findByTenant(current.sandbox_id);
      if (!record) throw new AppError(503, 'SANDBOX_UNAVAILABLE', 'The workspace sandbox is unavailable');
      const userId = `usr_sandbox_${hash(current.email).slice(0, 24)}`;
      return { ...issueWidgetSession(record, { userId, userEmail: '', userRoles: ['member'], plan: 'standard' }, widgetSecret), userId };
    });
    api.post('/environments/:env/credential', async request => createIntegrationCredential(sessions, await manage(request)));
    api.delete('/environments/:env/credential', async request => {
      await sessions.revoke(await manage(request));
      return { ok: true };
    });
    api.post('/environments/:env/origins', async request => {
      const tenant = await manage(request);
      const { origin } = validateBody(originBody, request.body);
      await store.addOrigin(tenant, new URL(origin).origin);
      return { origins: await store.listOrigins(tenant) };
    });
    api.post('/environments/:env/origins/verify', async request => {
      const tenant = await manage(request);
      const { origin: value } = validateBody(originBody, request.body);
      const { origin, hostname } = new URL(value);
      const entry = (await store.listOrigins(tenant)).find(item => item.origin === origin);
      if (!entry) throw new AppError(404, 'ORIGIN_NOT_FOUND', 'Add this browser origin before verifying it');
      const records = await lookup(`_ai-support.${hostname}`).catch(() => []);
      if (!records.some(chunks => chunks.join('') === `ai-support=${entry.challenge}`)) {
        throw new AppError(409, 'ORIGIN_DNS_NOT_VERIFIED', 'The verification TXT record was not found. Check DNS and try again.');
      }
      await store.verifyOrigin(tenant, origin, entry.challenge);
      return { origins: await store.listOrigins(tenant) };
    });
    api.delete('/environments/:env/origins', async request => {
      const tenant = await manage(request);
      const { origin } = validateBody(originBody, request.body);
      await store.removeOrigin(tenant, new URL(origin).origin);
      return { origins: await store.listOrigins(tenant) };
    });

    if (options.mcp) {
      const mcp = options.mcp;
      const configPath = '/environments/:env/mcp';
      async function mcpTenant(request: FastifyRequest) {
        const current = await account(request);
        if (current.role !== 'owner') throw new ForbiddenError('Only the workspace owner can configure MCP');
        return environmentTenant(request, current);
      }
      api.get(configPath, async request => mcp.get(await mcpTenant(request), request.id));
      api.put(configPath, async request => mcp.replace(await mcpTenant(request), request.body, request.id));
      api.delete(configPath, async request => mcp.remove(await mcpTenant(request), request.id));
    }
    registerWorkspaceOperations(api, options, account);
  }, { prefix });
}
