import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ConflictError, UnauthorizedError } from '../../shared/errors.js';
import { createDbTenantStore } from '../../shared/db-stores.js';
import { createTenantService } from '../admin/tenant.service.js';
import { createSessionStore } from '../sessions/session.store.js';

export const secret = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sessionDuration = 7 * 24 * 3600;
export type Environment = 'staging' | 'production';
type Invite = { workspaceId: string; role: 'developer' | 'support' };
type Role = 'owner' | 'developer' | 'support';
type Workspace = {
  id: string;
  name: string;
  email: string;
  role: Role;
  staging_id: string;
  production_id: string;
  sandbox_id: string;
  locale: string | null;
};
type OriginRow = { origin: string; challenge: string; verified_at: Date | null };

const workspaceFields = sql`w.id, w.name, w.staging_id, w.production_id, w.sandbox_id, a.email, a.role, a.locale`;

export function createWorkspaceStore(db: PostgresJsDatabase) {
  const credentials = createSessionStore(db);
  return {
    async saveLink(token: string, email: string, workspaceName: string, expiresAt: Date, invitation?: Invite, locale?: string) {
      await db.execute(sql`delete from workspace_login_links where expires_at < now()`);
      await db.execute(sql`insert into workspace_login_links (token_hash, email, workspace_name, expires_at, invited_workspace_id, invited_role, locale)
        values (${hash(token)}, ${email}, ${workspaceName}, ${expiresAt.toISOString()}, ${invitation?.workspaceId ?? null}, ${invitation?.role ?? null}, ${locale ?? null})`);
    },
    async deleteLink(token: string) {
      await db.execute(sql`delete from workspace_login_links where token_hash = ${hash(token)}`);
    },
    async consumeLink(token: string, requestId: string) {
      const session = secret();
      const workspace = await db.transaction(async tx => {
        const [link] = await tx.execute<{ email: string; workspace_name: string; invited_workspace_id: string | null; invited_role: Invite['role'] | null; locale: string | null }>(sql`delete from workspace_login_links
          where token_hash = ${hash(token)} and expires_at > now() returning email, workspace_name, invited_workspace_id, invited_role, locale`);
        if (!link) throw new UnauthorizedError('This link has expired or was already used. Request a new link.');
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${link.email}, 7191))`);
        let [account] = await tx.execute<Workspace>(sql`select ${workspaceFields} from workspace_accounts a
          join workspaces w on a.workspace_id = w.id where a.email = ${link.email}`);
        if (link.invited_workspace_id && link.invited_role) {
          if (account && account.id !== link.invited_workspace_id) {
            throw new ConflictError('This email already belongs to a different workspace', 'WORKSPACE_MEMBERSHIP_CONFLICT');
          }
          if (!account) {
            await tx.execute(sql`insert into workspace_accounts (email, workspace_id, role, locale)
              values (${link.email}, ${link.invited_workspace_id}, ${link.invited_role}, ${link.locale})`);
            [account] = await tx.execute<Workspace>(sql`select ${workspaceFields} from workspace_accounts a
              join workspaces w on a.workspace_id = w.id where a.email = ${link.email}`);
          }
        }
        if (!account) {
          const service = createTenantService(createDbTenantStore(tx));
          const staging = await service.createTenant(`${link.workspace_name} · Staging`, 'starter', undefined, '', '', requestId);
          const production = await service.createTenant(`${link.workspace_name} · Production`, 'starter', undefined, '', '', requestId);
          const sandbox = await service.createTenant(`${link.workspace_name} · Sandbox`, 'starter', undefined, '', '', requestId);
          const id = `wsp_${randomUUID()}`;
          account = { id, name: link.workspace_name, email: link.email, role: 'owner', staging_id: staging.tenant.id,
            production_id: production.tenant.id, sandbox_id: sandbox.tenant.id, locale: link.locale };
          await tx.execute(sql`insert into workspaces (id, name, staging_id, production_id, sandbox_id)
            values (${id}, ${account.name}, ${account.staging_id}, ${account.production_id}, ${account.sandbox_id})`);
          await tx.execute(sql`insert into workspace_accounts (email, workspace_id, locale) values (${account.email}, ${id}, ${link.locale})`);
          await createSessionStore(tx).replace({ tenantId: account.sandbox_id, id: `sandbox_${randomUUID()}`,
            tokenHash: hash(secret()), createdAt: new Date() });
        }
        await tx.execute(sql`delete from workspace_sessions where expires_at < now()`);
        await tx.execute(sql`insert into workspace_sessions (token_hash, account_email, expires_at)
          values (${hash(session)}, ${account.email}, now() + (${sessionDuration} * interval '1 second'))`);
        return account;
      });
      return { session, workspace };
    },
    async session(token: string) {
      const [account] = await db.execute<Workspace>(sql`select ${workspaceFields} from workspace_sessions s
        join workspace_accounts a on s.account_email = a.email join workspaces w on w.id = a.workspace_id
        where s.token_hash = ${hash(token)} and s.expires_at > now()`);
      return account;
    },
    async signOut(token: string) {
      await db.execute(sql`delete from workspace_sessions where token_hash = ${hash(token)}`);
    },
    async setLocale(email: string, workspaceId: string, locale: string) {
      await db.execute(sql`update workspace_accounts set locale = ${locale} where email = ${email} and workspace_id = ${workspaceId}`);
    },
    async listOrigins(tenantId: string) {
      return db.execute<OriginRow>(sql`select origin, challenge, verified_at from workspace_origins
        where tenant_id = ${tenantId} order by origin`);
    },
    async addOrigin(tenantId: string, origin: string) {
      await db.execute(sql`insert into workspace_origins (tenant_id, origin, challenge)
        values (${tenantId}, ${origin}, ${secret()}) on conflict do nothing`);
    },
    async verifyOrigin(tenantId: string, origin: string, challenge: string) {
      await db.execute(sql`update workspace_origins set verified_at = now()
        where tenant_id = ${tenantId} and origin = ${origin} and challenge = ${challenge}`);
    },
    async removeOrigin(tenantId: string, origin: string) {
      await db.execute(sql`delete from workspace_origins where tenant_id = ${tenantId} and origin = ${origin}`);
    },
    async isVerifiedOrigin(origin: string, tenantId?: string) {
      const [entry] = await db.execute(sql`select 1 from workspace_origins where origin = ${origin} and verified_at is not null
        ${tenantId ? sql`and tenant_id = ${tenantId}` : sql``} limit 1`);
      return Boolean(entry);
    },
    async integrationStatus(tenantId: string) {
      const credential = await credentials.findByTenant(tenantId);
      const [answer] = await db.execute(sql`select 1 from cases c inner join messages m on c.id = m.case_id
        where c.tenant_id = ${tenantId} and m.role = 'assistant' limit 1`);
      return { hasCredential: Boolean(credential), hasAnswer: Boolean(answer), origins: await this.listOrigins(tenantId) };
    },
    async members(workspaceId: string) {
      return db.execute<{ email: string; role: Role }>(sql`select email, role from workspace_accounts
        where workspace_id = ${workspaceId} order by role, email`);
    },
    async removeMember(workspaceId: string, email: string) {
      await db.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${email}, 7191))`);
        await tx.execute(sql`delete from workspace_login_links where email = ${email} and invited_workspace_id = ${workspaceId}`);
        await tx.execute(sql`delete from workspace_accounts where workspace_id = ${workspaceId} and email = ${email} and role <> 'owner'`);
      });
    },
    async conversations(tenantId: string, before?: string) {
      return db.execute<{ id: string; status: string; created_at: Date; rating: number | null }>(sql`select id, status, created_at, rating
        from cases where tenant_id = ${tenantId}
        ${before ? sql`and (created_at, id) < (select created_at, id from cases where id = ${before} and tenant_id = ${tenantId})` : sql``}
        order by created_at desc, id desc limit 31`);
    },
    async conversation(tenantId: string, caseId: string) {
      const [entry] = await db.execute<{ id: string; status: string }>(sql`select id, status from cases where id = ${caseId} and tenant_id = ${tenantId}`);
      if (!entry) return undefined;
      const messages = await db.execute<{ id: string; role: string; content: string; created_at: Date }>(sql`select m.id, m.role, m.content, m.created_at
        from messages m join cases c on c.id = m.case_id where c.id = ${caseId} and c.tenant_id = ${tenantId} order by m.created_at, m.id`);
      return { ...entry, messages };
    },
  };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
