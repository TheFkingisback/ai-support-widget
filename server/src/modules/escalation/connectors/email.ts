import { log } from '../../../shared/logger.js';
import type { Connector, TicketPayload, TicketResult } from './connector.js';

interface EmailConfig {
  sendFn: (to: string, subject: string, body: string) => Promise<void>;
  recipientEmail: string;
}

export function createEmailConnector(config: EmailConfig): Connector {
  return {
    name: 'email',

    async createTicket(payload: TicketPayload, requestId?: string): Promise<TicketResult> {
      log.info('Email: sending ticket via email', requestId, {
        caseId: payload.caseId,
        priority: payload.priority,
      });

      const subject = `[${payload.priority.toUpperCase()}] Support Escalation: ${payload.summary}`;
      const body = [
        `Case ID: ${payload.caseId}`,
        `Tenant: ${payload.tenantId}`,
        `Priority: ${payload.priority}`,
        `Tags: ${payload.tags.join(', ') || 'none'}`,
        '',
        '--- Description ---',
        payload.description,
      ].join('\n');

      await config.sendFn(config.recipientEmail, subject, body);

      const externalId = `email_${payload.caseId}`;
      const externalUrl = `mailto:${config.recipientEmail}`;

      log.info('Email: ticket sent', requestId, { externalId, recipient: config.recipientEmail });

      return { externalId, externalUrl };
    },
  };
}
