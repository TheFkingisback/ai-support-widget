import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { createActionSigner } from './action-proof.js';
import { fixture } from './action-fixtures.test-helper.js';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
describe('Independent action confirmation proof', () => {
  it('binds exact version, identity, human message, audience and expiry to an RSA signature', async () => {
    const f = await fixture(); await f.prepare(); const record = f.records[0];
    const now = Date.now(); const signer = createActionSigner(pem, 'support_actions_1', () => now);
    expect(() => signer.sign(record, f.mcp.serverUrl, 'jti_1')).toThrow();
    record.state = 'executing'; record.confirmationMessageId = 'human_1';
    const token = signer.sign(record, f.mcp.serverUrl, 'jti_1'); const [header, payload, signature] = token.split('.');
    expect(verify('RSA-SHA256', Buffer.from(header + '.' + payload), publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'support-action+jwt', kid: 'support_actions_1' });
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    expect(claims).toMatchObject({ aud: f.mcp.serverUrl, tenantId: f.p.tenantId, sub: f.p.userId,
      conversationId: f.p.caseId, actionId: record.proposal.actionId, summaryHash: record.proposal.summaryHash,
      argumentsHash: record.proposal.argumentsHash, messageId: 'human_1', presentedMessageId: record.presentedMessageId, jti: 'jti_1' });
    expect(signer.verification?.publicKeyPem).toBe(publicKey.export({ type: 'spki', format: 'pem' }).toString());
    expect(JSON.stringify(signer.verification)).not.toContain('PRIVATE');
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(60);
    expect(claims.exp * 1000).toBeLessThanOrEqual(Date.parse(record.proposal.expiresAt));
    expect(token).not.toContain(f.mcp.serviceToken);
    expect(() => createActionSigner(pem, 'invalid key id')).toThrow();
    record.proposal.expiresAt = new Date(now - 1000).toISOString(); expect(() => signer.sign(record, f.mcp.serverUrl, 'jti_2')).toThrow();
  });
});
