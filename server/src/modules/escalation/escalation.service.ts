import crypto from 'node:crypto';
import { log } from '../../shared/logger.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { Connector } from './connectors/connector.js';
import { buildTicket } from './ticket-builder.js';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export interface TicketRecord {
  id: string;
  tenantId: string;
  caseId: string;
  externalId: string;
  externalUrl: string;
  connector: string;
  status: string;
  createdAt: string;
}

export interface TicketStore {
  save(record: TicketRecord): Promise<void>;
}

export interface EscalationService {
  escalate(
    caseId: string,
    tenantId: string,
    reason: string | undefined,
    requestId?: string,
  ): Promise<{ ticketId: string; ticketUrl: string }>;
}

export interface EscalationDeps {
  gatewayService: GatewayService;
  snapshotService: SnapshotService;
  ticketStore: TicketStore;
  connectors: Record<string, Connector>;
  tenantConnectorMap: Record<string, string>;
  defaultConnector: string;
}

export function createEscalationService(deps: EscalationDeps): EscalationService {
  const {
    gatewayService,
    snapshotService,
    ticketStore,
    connectors,
    tenantConnectorMap,
    defaultConnector,
  } = deps;

  return {
    async escalate(caseId, tenantId, reason, requestId) {
      log.info('Escalating case', requestId, { caseId, tenantId, reason });

      // 1. Load case + messages
      const { case: caseData, messages } = await gatewayService.getCase(
        caseId, tenantId, requestId,
      );

      // 2. Load snapshot (graceful failure)
      let snapshot = null;
      try {
        snapshot = await snapshotService.getSnapshot(
          caseData.snapshotId, tenantId, requestId,
        );
      } catch (err) {
        log.warn('Escalation: snapshot not found', requestId, {
          snapshotId: caseData.snapshotId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // 3. Build ticket payload
      const payload = buildTicket(caseData, messages, snapshot, requestId);

      // 4. Select connector
      const connectorName = tenantConnectorMap[tenantId] ?? defaultConnector;
      const connector = connectors[connectorName];
      if (!connector) {
        throw new Error(`No connector found: ${connectorName}`);
      }

      // 5. Create ticket via connector
      const { externalId, externalUrl } = await connector.createTicket(payload, requestId);

      // 6. Store ticket record
      const ticketId = genId('tkt');
      await ticketStore.save({
        id: ticketId,
        tenantId,
        caseId,
        externalId,
        externalUrl,
        connector: connectorName,
        status: 'open',
        createdAt: new Date().toISOString(),
      });

      // 7. Update case status to escalated
      await gatewayService.escalateCase(caseId, tenantId, reason, requestId);

      log.info('Case escalated successfully', requestId, {
        caseId,
        ticketId,
        connector: connectorName,
        externalId,
      });

      return { ticketId: externalId, ticketUrl: externalUrl };
    },
  };
}
