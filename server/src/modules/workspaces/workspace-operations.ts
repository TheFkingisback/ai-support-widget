import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError, ForbiddenError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';
import { localeSchema, type WorkspaceOptions } from './workspace-routes.js';
import { hash, secret, type WorkspaceStore } from './workspace-store.js';
import { defaultLocale, matchLocale } from '@ai-support/shared/locales';
import { suggestionId, suggestionStatus } from './suggestions.js';

const email = z.string().email().max(254).toLowerCase();
const environment = z.enum(['sandbox', 'staging', 'production']);
const caseId = z.string().regex(/^cas_[a-zA-Z0-9_-]{1,80}$/);
type Account = NonNullable<Awaited<ReturnType<WorkspaceStore['session']>>>;

export function registerWorkspaceOperations(api: FastifyInstance, options: WorkspaceOptions, account: (request: FastifyRequest) => Promise<Account>) {
  const { store, mail, publicOrigin } = options;
  async function owner(request: FastifyRequest) {
    const current = await account(request);
    if (current.role !== 'owner') throw new ForbiddenError('Only the workspace owner can manage members');
    return current;
  }
  function tenant(current: Account, env: z.output<typeof environment>) {
    return current[`${env}_id`];
  }
  if (options.suggestions) {
    const suggestions = options.suggestions;
    api.get('/suggestions', async request => {
      const current = await account(request);
      const { env, before } = validateBody(z.object({ env: environment, before: suggestionId.optional() }), request.query);
      return suggestions.list(tenant(current, env), before);
    });
    api.patch('/suggestions/:id', async request => {
      const current = await owner(request);
      const { id } = validateBody(z.object({ id: suggestionId }), request.params);
      const { env, status } = validateBody(z.object({ env: environment, status: suggestionStatus }).strict(), request.body);
      return suggestions.setStatus(tenant(current, env), id, status);
    });
  }
  api.get('/team', async request => ({ members: await store.members((await owner(request)).id) }));
  api.post('/team', async (request, reply) => {
    const current = await owner(request);
    const invite = validateBody(z.object({ email, role: z.enum(['developer', 'support']), locale: localeSchema.optional() }).strict(), request.body);
    if (invite.email === current.email) throw new AppError(409, 'WORKSPACE_OWNER_EXISTS', 'This email already owns your workspace');
    if (!mail) throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'Workspace invitations are currently unavailable.');
    await options.rateLimiter?.check(`mail-workspace:${current.id}`, 20, 60_000, request.id);
    await options.rateLimiter?.check(`mail-to:${hash(invite.email)}`, 1, 60_000, request.id);
    const token = secret();
    const locale = invite.locale ?? matchLocale(current.locale) ?? defaultLocale;
    await store.saveLink(token, invite.email, current.name, new Date(Date.now() + 20 * 60_000), { workspaceId: current.id, role: invite.role }, locale);
    try { await mail.send(invite.email, `${publicOrigin}/signup?lang=${locale}#confirm=${token}`, locale, true); }
    catch {
      await store.deleteLink(token);
      throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'The invitation could not be sent. Try again shortly.');
    }
    return reply.code(202).send({ ok: true });
  });
  api.delete('/team', async request => {
    const current = await owner(request);
    const target = validateBody(z.object({ email }).strict(), request.body);
    if (target.email === current.email) throw new ForbiddenError('The workspace owner cannot be removed');
    await store.removeMember(current.id, target.email);
    return { ok: true };
  });
  api.get('/conversations', async request => {
    const current = await account(request);
    const query = validateBody(z.object({ env: environment, before: caseId.optional() }), request.query);
    const conversations = await store.conversations(tenant(current, query.env), query.before);
    const page = conversations.slice(0, 30);
    return { conversations: page, next: conversations.length > page.length ? page.at(-1)?.id ?? null : null };
  });
  api.get('/conversations/:id', async request => {
    const current = await account(request);
    const { env } = validateBody(z.object({ env: environment }), request.query);
    const { id } = validateBody(z.object({ id: caseId }), request.params);
    const conversation = await store.conversation(tenant(current, env), id);
    if (!conversation) throw new AppError(404, 'CASE_NOT_FOUND', 'Conversation not found');
    return conversation;
  });
}
