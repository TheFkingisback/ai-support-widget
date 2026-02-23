import crypto from 'node:crypto';
import { log } from '../../shared/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { Tenant, TenantConfig } from '../../shared/types.js';
import { hashApiKey } from './admin-auth.js';
import { encryptToken, decryptToken } from './encryption.js';

export { encryptToken, decryptToken };

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function generateAdminKey(): string {
  return `tsk_${crypto.randomBytes(24).toString('base64url')}`;
}

const PLAN_DEFAULTS: Record<string, TenantConfig> = {
  starter: {
    maxContextBytes: 1_000_000, maxEventWindowHours: 24, maxLogLines: 100,
    maxDocs: 5, modelPolicy: 'fast', retentionDays: 30, enabledConnectors: ['email'],
  },
  pro: {
    maxContextBytes: 5_000_000, maxEventWindowHours: 72, maxLogLines: 500,
    maxDocs: 20, modelPolicy: 'auto', retentionDays: 90, enabledConnectors: ['email', 'zendesk'],
  },
  enterprise: {
    maxContextBytes: 10_000_000, maxEventWindowHours: 168, maxLogLines: 1000,
    maxDocs: 50, modelPolicy: 'strong', retentionDays: 365, enabledConnectors: ['email', 'zendesk', 'jira'],
  },
};

export interface TenantStore {
  save(tenant: TenantRecord): Promise<void>;
  update(id: string, fields: Partial<TenantRecord>): Promise<void>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TenantRecord | null>;
  findAll(): Promise<TenantRecord[]>;
  findByAdminKeyHash(hash: string): Promise<TenantRecord | null>;
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

export interface CreateTenantResult {
  tenant: Tenant;
  adminApiKey: string;
}

export interface TenantService {
  createTenant(
    name: string, plan: string, config: Partial<TenantConfig> | undefined,
    apiBaseUrl: string, serviceToken: string, requestId?: string,
  ): Promise<CreateTenantResult>;

  updateTenant(
    tenantId: string,
    updates: Partial<{ name: string; plan: string; config: Partial<TenantConfig> }>,
    requestId?: string,
  ): Promise<Tenant>;

  resetAdminKey(tenantId: string, requestId?: string): Promise<{ adminApiKey: string }>;
  deleteTenant(tenantId: string, requestId?: string): Promise<void>;
  getTenant(tenantId: string, requestId?: string): Promise<Tenant>;
  listTenants(requestId?: string): Promise<Tenant[]>;
  findTenantByAdminKeyHash(hash: string, requestId?: string): Promise<Tenant | null>;
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
      const adminApiKey = generateAdminKey();
      const mergedConfig: TenantConfig = {
        ...defaults, ...config, adminApiKeyHash: hashApiKey(adminApiKey),
      };

      const record: TenantRecord = {
        id, name, plan, config: mergedConfig,
        apiBaseUrl, serviceToken: encryptToken(serviceToken),
        createdAt: now, updatedAt: now,
      };

      await store.save(record);
      log.info('Tenant created', requestId, { tenantId: id, name, plan });
      return { tenant: toTenant(record), adminApiKey };
    },

    async updateTenant(tenantId, updates, requestId) {
      const existing = await store.findById(tenantId);
      if (!existing) throw new NotFoundError('Tenant', tenantId);

      const fields: Partial<TenantRecord> = { updatedAt: new Date().toISOString() };
      if (updates.name) fields.name = updates.name;
      if (updates.plan) {
        if (!PLAN_DEFAULTS[updates.plan]) {
          throw new ValidationError(`Invalid plan: ${updates.plan}`, 'plan');
        }
        fields.plan = updates.plan;
      }
      if (updates.config) {
        const { adminApiKeyHash: _strip, ...safeConfig } = updates.config;
        fields.config = { ...existing.config, ...safeConfig };
      }

      await store.update(tenantId, fields);
      const updated = await store.findById(tenantId);
      log.info('Tenant updated', requestId, { tenantId, changedFields: Object.keys(updates) });
      return toTenant(updated!);
    },

    async resetAdminKey(tenantId, requestId) {
      const existing = await store.findById(tenantId);
      if (!existing) throw new NotFoundError('Tenant', tenantId);

      const adminApiKey = generateAdminKey();
      const config = { ...existing.config, adminApiKeyHash: hashApiKey(adminApiKey) };
      await store.update(tenantId, { config, updatedAt: new Date().toISOString() });

      log.info('Tenant admin key reset', requestId, { tenantId });
      return { adminApiKey };
    },

    async deleteTenant(tenantId, requestId) {
      const existing = await store.findById(tenantId);
      if (!existing) throw new NotFoundError('Tenant', tenantId);
      await store.delete(tenantId);
      log.info('Tenant deleted', requestId, { tenantId });
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

    async findTenantByAdminKeyHash(hash, requestId) {
      const record = await store.findByAdminKeyHash(hash);
      if (!record) return null;
      log.debug('Tenant found by admin key hash', requestId, { tenantId: record.id });
      return toTenant(record);
    },
  };
}
