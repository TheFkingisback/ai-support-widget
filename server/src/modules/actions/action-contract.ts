import { z } from 'zod';
import { createHash } from 'node:crypto';
import { safeText } from '../context/safe-content.js';

export const operationName = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
export const actionPolicySchema = z.object({
  contractVersion: z.literal(1), enabled: z.boolean(),
  operations: z.array(operationName).max(50).refine(v => new Set(v).size === v.length, 'Duplicate operation'),
}).strict().refine(p => !p.enabled || p.operations.length > 0, 'Enabled actions require an operation');
export type ActionPolicy = z.infer<typeof actionPolicySchema>;
export interface Principal { tenantId: string; userId: string; caseId: string }
export const actionArguments = z.object({
  operation: operationName, arguments: z.record(z.unknown()),
}).strict();
export const digest = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const literalText = z.string().min(1).max(4000).refine(s =>
  safeText(s) === s && !/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(s));
export const proposalSchema = z.object({
  contractVersion: z.literal(1), actionId: id, status: z.literal('pending_confirmation'),
  operation: operationName, summary: literalText,
  argumentsHash: hash, summaryHash: hash, expiresAt: z.string().datetime(),
}).strict().refine(p => digest(p.summary) === p.summaryHash, 'Summary hash mismatch');
export type Proposal = z.infer<typeof proposalSchema>;
export const resultSchema = z.object({
  contractVersion: z.literal(1), actionId: id,
  status: z.enum(['pending_confirmation', 'executing', 'completed', 'failed', 'conflict', 'expired', 'cancelled']),
  message: literalText.optional(),
}).strict();
export type ActionResult = z.infer<typeof resultSchema>;
export type ActionState = ActionResult['status'] | 'unknown';
export interface ActionRecord extends Principal {
  id: string; proposal: Proposal; state: ActionState; connectorHash: string;
  presentedMessageId: string | null; confirmationMessageId: string | null;
  createdAt: Date; updatedAt: Date;
}
export const terminal = (state: ActionState): boolean =>
  ['completed', 'failed', 'conflict', 'expired', 'cancelled'].includes(state);
