import { createPrivateKey, createPublicKey, sign, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ActionRecord } from './action-contract.js';
import { AppError } from '../../shared/errors.js';

export interface ActionVerification { keyId: string; algorithm: 'RS256'; issuer: string; publicKeyPem: string }
export interface ActionSigner {
  readonly verification?: ActionVerification;
  sign(record: ActionRecord, audience: string, authorizationId: string): string;
}
const issuer = 'https://support-ai.pontes.uk/mcp-actions';
const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
/** Uses an independent RSA private key; emits short-lived proof only after a stored human confirmation. */
export function createActionSigner(pem: string, keyId: string, clock = Date.now): ActionSigner {
  const key: KeyObject = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(keyId)) throw new Error('Invalid action signing key');
  return { verification: { keyId, algorithm: 'RS256', issuer,
    publicKeyPem: createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString() },
    sign(record, audience, authorizationId) {
    const now = Math.floor(clock() / 1000);
    const exp = Math.min(now + 60, Math.floor(Date.parse(record.proposal.expiresAt) / 1000));
    if (record.state !== 'executing' || !record.confirmationMessageId || !record.presentedMessageId || exp <= now) {
      throw new AppError(409, 'ACTION_CONFIRMATION_REQUIRED', 'No valid confirmation');
    }
    const body = { iss: issuer, aud: audience,
      sub: record.userId, tenantId: record.tenantId, conversationId: record.caseId,
      actionId: record.proposal.actionId, operation: record.proposal.operation,
      argumentsHash: record.proposal.argumentsHash, summaryHash: record.proposal.summaryHash,
      messageId: record.confirmationMessageId, presentedMessageId: record.presentedMessageId,
      jti: authorizationId, iat: now, exp };
    const unsigned = encode({ alg: 'RS256', typ: 'support-action+jwt', kid: keyId }) + '.' + encode(body);
    return unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url');
  } };
}
/** Missing configuration keeps mutations disabled; malformed configured keys fail startup. */
export function actionSignerFromEnv(): ActionSigner | undefined {
  const file = process.env.MCP_ACTION_PRIVATE_KEY_FILE;
  if (!file) return undefined;
  return createActionSigner(readFileSync(file, 'utf8'), process.env.MCP_ACTION_KEY_ID ?? '');
}
