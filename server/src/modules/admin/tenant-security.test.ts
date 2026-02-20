import { describe, it, expect, beforeEach } from 'vitest';
import { encryptToken, decryptToken } from './tenant.service.js';
import { resetEnvCache } from '../../shared/env.js';
import { setLogLevel } from '../../shared/logger.js';

describe('Token Encryption Key Handling', () => {
  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    resetEnvCache();
    setLogLevel('off');
  });

  it('encrypts and decrypts with TOKEN_ENCRYPTION_KEY when set', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'dedicated-encryption-key-abc123';
    process.env.JWT_SECRET = 'jwt-secret-xyz';
    resetEnvCache();

    const plaintext = 'sk-service-token-12345';
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('falls back to JWT_SECRET when TOKEN_ENCRYPTION_KEY is not set', () => {
    process.env.JWT_SECRET = 'jwt-secret-fallback';
    resetEnvCache();

    const plaintext = 'sk-service-token-67890';
    const encrypted = encryptToken(plaintext);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('throws when neither key is set', () => {
    process.env.JWT_SECRET = '';
    resetEnvCache();

    expect(() => encryptToken('anything')).toThrow(
      'Neither TOKEN_ENCRYPTION_KEY nor JWT_SECRET is set',
    );
  });

  it('fails to decrypt when key changes between encrypt and decrypt', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'key-A-for-encryption';
    process.env.JWT_SECRET = 'unused';
    resetEnvCache();

    const encrypted = encryptToken('secret-data');

    // Switch to a different key
    process.env.TOKEN_ENCRYPTION_KEY = 'key-B-different';
    resetEnvCache();

    expect(() => decryptToken(encrypted)).toThrow();
  });
});
