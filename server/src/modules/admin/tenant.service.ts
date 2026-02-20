import crypto from 'node:crypto';
import { log } from '../../shared/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { getEnvSafe } from '../../shared/env.js';
import type { Tenant, TenantConfig } from '../../shared/types.js';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

const PLAN_DEFAULTS: Record<string, TenantConfig> = {
  starter: {
    maxContextBytes: 1_000_000,
    maxEventWindowHours: 24,
    maxLogLines: 100,
    maxDocs: 5,
    modelPolicy: 'fast',
    retentionDays: 30,
    enabledConnectors: ['email'],
  },
  pro: {
    maxContextBytes: 5_000_000,
    maxEventWindowHours: 72,
    maxLogLines: 500,
    maxDocs: 20,
    modelPolicy: 'auto',
    retentionDays: 90,
    enabledConnectors: ['email', 'zendesk'],
  },
  enterprise: {
    maxContextBytes: 10_000_000,
    maxEventWindowHours: 168,
    maxLogLines: 1000,
    maxDocs: 50,
    modelPolicy: 'strong',
    retentionDays: 365,
    enabledConnectors: ['email', 'zendesk', 'jira'],
  },
};

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

export interface TenantStore {
  save(tenant: TenantRecord): Promise<void>;
  update(id: string, fields: Partial<TenantRecord>): Promise<void>;
  findById(id: string): Promise<TenantRecord | null>;
  findAll(): Promise<TenantRecord[]>;
}

export interface TenantRecord {
  id: string;
  name: string;
  plan: string;
  config: TenantConfig;
  apiBaseUrl: string;
  serviceToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantService {
  createTenant(
    name: string,
    plan: string,
    config: Partial<TenantConfig> | undefined,
    apiBaseUrl: string,
    serviceToken: string,
    requestId?: string,
  ): Promise<Tenant>;

  updateTenant(
    tenantId: string,
    updates: Partial<{ name: string; plan: string; config: Partial<TenantConfig> }>,
    requestId?: string,
  ): Promise<Tenant>;

  getTenant(tenantId: string, requestId?: string): Promise<Tenant>;
  listTenants(requestId?: string): Promise<Tenant[]>;
}

function toTenant(record: TenantRecord): Tenant {
  return {
    id: record.id,
    name: record.name,
    plan: record.plan as Tenant['plan'],
    config: record.config,
    createdAt: record.createdAt,
  };
}

export function createTenantService(store: TenantStore): TenantService {
  return {
    async createTenant(name, plan, config, apiBaseUrl, serviceToken, requestId) {
      if (!PLAN_DEFAULTS[plan]) {
        throw new ValidationError(`Invalid plan: ${plan}`, 'plan');
      }

      const id = genId('ten');
      const now = new Date().toISOString();
      const defaults = PLAN_DEFAULTS[plan];
      const mergedConfig: TenantConfig = { ...defaults, ...config };

      const record: TenantRecord = {
        id,
        name,
        plan,
        config: mergedConfig,
        apiBaseUrl,
        serviceToken: encryptToken(serviceToken),
        createdAt: now,
        updatedAt: now,
      };

      await store.save(record);
      log.info('Tenant created', requestId, { tenantId: id, name, plan });
      return toTenant(record);
    },

    async updateTenant(tenantId, updates, requestId) {
      const existing = await store.findById(tenantId);
      if (!existing) throw new NotFoundError('Tenant', tenantId);

      const fields: Partial<TenantRecord> = { updatedAt: new Date().toISOString() };
      if (updates.name) fields.name = updates.name;
      if (updates.plan) {
        fields.plan = updates.plan;
        if (!PLAN_DEFAULTS[updates.plan]) {
          throw new ValidationError(`Invalid plan: ${updates.plan}`, 'plan');
        }
      }
      if (updates.config) {
        fields.config = { ...existing.config, ...updates.config };
      }

      await store.update(tenantId, fields);
      const updated = await store.findById(tenantId);
      log.info('Tenant updated', requestId, {
        tenantId,
        changedFields: Object.keys(updates),
      });
      return toTenant(updated!);
    },

    async getTenant(tenantId, requestId) {
      const record = await store.findById(tenantId);
      if (!record) throw new NotFoundError('Tenant', tenantId);
      log.debug('Tenant retrieved', requestId, { tenantId });
      return toTenant(record);
    },

    async listTenants(requestId) {
      const records = await store.findAll();
      log.debug('Tenants listed', requestId, { count: records.length });
      return records.map(toTenant);
    },
  };
}
