export interface Principal { tenantId: string; userId: string; caseId: string }
export interface Proposal {
  actionId: string; serverId: string; operation: string; signature: string;
  arguments: Record<string, unknown>; expiresAt: string;
}
export type ActionState = 'pending_confirmation' | 'executing' | 'unknown' | 'completed' | 'failed' | 'conflict' | 'expired' | 'cancelled';
export interface ActionRecord extends Principal {
  id: string; proposal: Proposal; state: ActionState; connectorHash: string;
  presentedMessageId: string | null; confirmationMessageId: string | null;
  createdAt: Date; updatedAt: Date;
}
