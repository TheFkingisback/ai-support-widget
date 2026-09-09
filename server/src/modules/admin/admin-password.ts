import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Versioned format with fixed parameters: N=32768, r=8, p=3.
export const ADMIN_PASSWORD_HASH_PATTERN = /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/;

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}

export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  if (!ADMIN_PASSWORD_HASH_PATTERN.test(hash)) return false;
  const [, salt, expected] = hash.split(':');
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
