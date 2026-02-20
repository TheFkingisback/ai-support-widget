export interface TicketPayload {
  summary: string;
  description: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  caseId: string;
  tenantId: string;
}

export interface TicketResult {
  externalId: string;
  externalUrl: string;
}

export interface Connector {
  name: string;
  createTicket(payload: TicketPayload, requestId?: string): Promise<TicketResult>;
}
