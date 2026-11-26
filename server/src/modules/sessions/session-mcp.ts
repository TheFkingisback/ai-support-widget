import type Redis from 'ioredis';
import { z } from 'zod';
import { encryptToken, decryptToken } from '../admin/encryption.js';
import { validateMcpUrl } from '../orchestrator/mcp-network.js';
import { WIDGET_SESSION_SECONDS } from '../../shared/token-policy.js';

export const sessionServers = z.array(z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  url: z.string().max(2048).transform(url => validateMcpUrl(url).href),
  accessToken: z.string().min(1).max(8192).regex(/^[A-Za-z0-9._~+/-]+=*$/)
    .refine(token => !/^(sik_|tsk_)/.test(token), 'Expected a delegated MCP access token'),
}).strict()).max(8).superRefine((servers, ctx) => {
  for (const key of ['id', 'url', 'accessToken'] as const) {
    if (new Set(servers.map(s => s[key])).size !== servers.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate MCP server ' + key });
  }
});
export type SessionServer = z.output<typeof sessionServers>[number];
export interface SessionBinding { tenantId: string; userId: string; sid: string }
export function sessionMcpStore(redis: Pick<Redis, 'get' | 'set'>) {
  const key = (sid: string) => 'support:session-mcp:' + sid;
  return {
    async save(binding: SessionBinding, servers: SessionServer[]) {
      await redis.set(key(binding.sid), encryptToken(JSON.stringify({ ...binding, servers })), 'EX', WIDGET_SESSION_SECONDS);
    },
    async resolve(tenantId: string, userId: string, sid?: string): Promise<SessionServer[]> {
      if (!sid) return [];
      const encrypted = await redis.get(key(sid));
      if (!encrypted) return [];
      const data = JSON.parse(decryptToken(encrypted));
      return data.tenantId === tenantId && data.userId === userId && data.sid === sid ? sessionServers.parse(data.servers) : [];
    },
  };
}
