import crypto from 'node:crypto';
import { getEnvSafe } from '../../shared/env.js';
import { log } from '../../shared/logger.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const env = getEnvSafe();
  const secret = env.TOKEN_ENCRYPTION_KEY ?? env.JWT_SECRET;
  if (!env.TOKEN_ENCRYPTION_KEY && env.JWT_SECRET) {
    log.warn('TOKEN_ENCRYPTION_KEY not set — falling back to JWT_SECRET. Set TOKEN_ENCRYPTION_KEY in production.');
  }
  if (!secret) {
    throw new Error('Neither TOKEN_ENCRYPTION_KEY nor JWT_SECRET is set — cannot encrypt tokens');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(token: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(token, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(encrypted: string): string {
  const key = deriveKey();
  const buf = Buffer.from(encrypted, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf-8');
}
