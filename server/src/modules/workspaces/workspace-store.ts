import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { UnauthorizedError } from '../../shared/errors.js';
import { createDbTenantStore } from '../../shared/db-stores.js';
import { createTenantService } from '../admin/tenant.service.js';
import { createSessionStore } from '../sessions/session.store.js';

export const secret = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sessionDuration = 7 * 24 * 3600;
export type Environment = 'staging' | 'production';
type Role = 'owner' | 'developer' | 'support';
type Workspace = {
  id: string;
  name: string;
  email: string;
  role: Role;
  staging_id: string;
  production_id: string;
  sandbox_id: string;
};
type OriginRow = { origin: string; challenge: string; verified_at: Date | null };

const workspaceFields = sql`w.id, w.name, w.staging_id, w.production_id, w.sandbox_id, a.email, a.role`;

export function createWorkspaceStore(db: PostgresJsDatabase) {
  const credentials = createSessionStore(db);
  return {
    async saveLink(token: string, email: string, workspaceName: string, expiresAt: Date) {
      await db.execute(sql`delete from workspace_login_links where expires_at < now()`);
      await db.execute(sql`insert into workspace_login_links (token_hash, email, workspace_name, expires_at)
        values (${hash(token)}, ${email}, ${workspaceName}, ${expiresAt.toISOString()})`);
    },
    async deleteLink(token: string) {
      await db.execute(sql`delete from workspace_login_links where token_hash = ${hash(token)}`);
    },
    async consumeLink(token: string, requestId: string) {
      const session = secret();
      const workspace = await db.transaction(async tx => {
        const [link] = await tx.execute<{ email: string; workspace_name: string }>(sql`delete from workspace_login_links
          where token_hash = ${hash(token)} and expires_at > now() returning email, workspace_name`);
        if (!link) throw new UnauthorizedError('This link has expired or was already used. Request a new link.');
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${link.email}, 7191))`);
        let [account] = await tx.execute<Workspace>(sql`select ${workspaceFields} from workspace_accounts a
          join workspaces w on a.workspace_id = w.id where a.email = ${link.email}`);
        if (!account) {
          const service = createTenantService(createDbTenantStore(tx));
          const staging = await service.createTenant(`${link.workspace_name} · Staging`, 'starter', undefined, '', '', requestId);
          const production = await service.createTenant(`${link.workspace_name} · Production`, 'starter', undefined, '', '', requestId);
          const sandbox = await service.createTenant(`${link.workspace_name} · Sandbox`, 'starter', undefined, '', '', requestId);
          const id = `wsp_${randomUUID()}`;
          account = { id, name: link.workspace_name, email: link.email, role: 'owner', staging_id: staging.tenant.id,
            production_id: production.tenant.id, sandbox_id: sandbox.tenant.id };
          await tx.execute(sql`insert into workspaces (id, name, staging_id, production_id, sandbox_id)
            values (${id}, ${account.name}, ${account.staging_id}, ${account.production_id}, ${account.sandbox_id})`);
          await tx.execute(sql`insert into workspace_accounts (email, workspace_id) values (${account.email}, ${id})`);
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
  };
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
