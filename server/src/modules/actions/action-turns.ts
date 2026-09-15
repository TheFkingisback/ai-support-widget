import type { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { ActionService } from './action-service.js';
/** One action-enabled turn at a time per authenticated conversation, including model preparation. */
export function withActionTurns(service: OrchestratorService, actions: ActionService): OrchestratorService {
  return { ...service, handleMessage(...args) {
    const [caseId, tenantId, userId] = args;
    return actions.withLock({ tenantId, userId, caseId }, () => service.handleMessage(...args));
  } };
}
