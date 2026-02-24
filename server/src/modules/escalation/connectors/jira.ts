import { log } from '../../../shared/logger.js';
import type { Connector, TicketPayload, TicketResult } from './connector.js';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

const PRIORITY_MAP: Record<string, string> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
  urgent: 'Highest',
};

/** Rejects private/internal IPs and non-HTTPS URLs. */
function validateBaseUrl(raw: string): void {
  const u = new URL(raw);
  if (u.protocol !== 'https:') {
    throw new Error('Jira baseUrl must use HTTPS');
  }
  const host = u.hostname;
  if (host === 'localhost' || host.startsWith('127.') || host.startsWith('10.') ||
      host.startsWith('192.168.') || host.startsWith('169.254.') || host === '0.0.0.0' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error('Jira baseUrl must not point to private/internal networks');
  }
}

export function createJiraConnector(config: JiraConfig): Connector {
  validateBaseUrl(config.baseUrl);

  return {
    name: 'jira',

    async createTicket(payload: TicketPayload, requestId?: string): Promise<TicketResult> {
      log.info('Jira: creating issue', requestId, {
        caseId: payload.caseId,
        priority: payload.priority,
      });

      const url = `${config.baseUrl}/rest/api/3/issue`;
      const body = {
        fields: {
          project: { key: config.projectKey },
          summary: payload.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: payload.description }],
              },
            ],
          },
          issuetype: { name: 'Task' },
          priority: { name: PRIORITY_MAP[payload.priority] ?? 'Medium' },
          labels: payload.tags,
        },
      };

      const credentials = Buffer.from(
        `${config.email}:${config.apiToken}`,
      ).toString('base64');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Jira API error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as { key: string };
      const externalId = data.key;
      const externalUrl = `${config.baseUrl}/browse/${externalId}`;

      log.info('Jira: issue created', requestId, { externalId, externalUrl });

      return { externalId, externalUrl };
    },
  };
}
