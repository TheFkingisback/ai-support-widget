import { log } from '../../../shared/logger.js';
import type { Connector, TicketPayload, TicketResult } from './connector.js';

interface ZendeskConfig {
  subdomain: string;
  apiToken: string;
  email: string;
}

const PRIORITY_MAP: Record<string, string> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
};

export function createZendeskConnector(config: ZendeskConfig): Connector {
  return {
    name: 'zendesk',

    async createTicket(payload: TicketPayload, requestId?: string): Promise<TicketResult> {
      log.info('Zendesk: creating ticket', requestId, {
        caseId: payload.caseId,
        priority: payload.priority,
      });

      const url = `https://${config.subdomain}.zendesk.com/api/v2/tickets.json`;
      const body = {
        ticket: {
          subject: payload.summary,
          description: payload.description,
          priority: PRIORITY_MAP[payload.priority] ?? 'normal',
          tags: payload.tags,
          external_id: payload.caseId,
        },
      };

      const credentials = Buffer.from(
        `${config.email}/token:${config.apiToken}`,
      ).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Zendesk API error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as { ticket: { id: number } };
      const externalId = String(data.ticket.id);
      const externalUrl = `https://${config.subdomain}.zendesk.com/agent/tickets/${externalId}`;

      log.info('Zendesk: ticket created', requestId, { externalId, externalUrl });

      return { externalId, externalUrl };
    },
  };
}
