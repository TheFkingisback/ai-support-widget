import type { Case, Message, SuggestedAction, Evidence } from '../../shared/types.js';
import type { GatewayService } from '../../modules/gateway/gateway.service.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { genId } from './test-utils.js';

export interface MockGateway extends GatewayService {
  _cases: Case[];
  _messages: Message[];
  _audit: Array<{
    tenantId: string;
    userId: string;
    caseId: string | null;
    action: string;
    details: Record<string, unknown>;
  }>;
}

export function createMockGatewayService(): MockGateway {
  const _cases: Case[] = [];
  const _messages: Message[] = [];
  const _audit: MockGateway['_audit'] = [];

  return {
    _cases,
    _messages,
    _audit,

    async createCase(tenantId, userId, firstMessage) {
      const caseId = genId('cas');
      const snapshotId = genId('scs');
      const now = new Date().toISOString();
      const newCase: Case = {
        id: caseId, tenantId, userId, status: 'active',
        snapshotId, createdAt: now, updatedAt: now,
        resolvedAt: null, messageCount: 1, feedback: null,
      };
      _cases.push(newCase);
      const msg: Message = {
        id: genId('msg'), caseId, role: 'user', content: firstMessage,
        actions: [], evidence: [], confidence: null, createdAt: now,
      };
      _messages.push(msg);
      _audit.push({ tenantId, userId, caseId, action: 'case_created', details: { firstMessage: firstMessage.slice(0, 100) } });
      return { case: newCase, message: msg };
    },

    async addMessage(caseId, tenantId, role, content, opts) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
      const now = new Date().toISOString();
      const msg: Message = {
        id: genId('msg'), caseId, role, content,
        actions: opts?.actions ?? [], evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null, createdAt: now,
      };
      _messages.push(msg);
      c.messageCount += 1;
      c.updatedAt = now;
      return msg;
    },

    async getCase(caseId, tenantId) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
      const msgs = _messages.filter((m) => m.caseId === caseId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { case: c, messages: msgs };
    },

    async addFeedback(caseId, tenantId, feedback) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
      c.feedback = feedback;
      c.updatedAt = new Date().toISOString();
      _audit.push({ tenantId, userId: c.userId, caseId, action: 'feedback_added', details: { feedback } });
    },

    async escalateCase(caseId, tenantId, reason) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
      c.status = 'escalated';
      c.updatedAt = new Date().toISOString();
      _audit.push({ tenantId, userId: c.userId, caseId, action: 'case_escalated', details: { reason: reason ?? 'No reason provided' } });
    },

    async logAudit(tenantId, userId, caseId, action, details) {
      _audit.push({ tenantId, userId, caseId, action, details });
    },
  };
}
