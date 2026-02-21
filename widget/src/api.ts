import type { Case, Message, SuggestedAction, ApiError } from './types.js';

export interface ApiClientConfig {
  apiUrl: string;
  getJwt: () => string;
  onTokenRefresh?: () => Promise<string>;
}

export interface ApiClient {
  createCase(message: string, context?: Record<string, unknown>): Promise<{ case: Case; snapshot: { id: string } }>;
  sendMessage(caseId: string, content: string): Promise<Message>;
  addFeedback(caseId: string, feedback: 'positive' | 'negative'): Promise<void>;
  escalate(caseId: string, reason?: string): Promise<{ ticketId: string; ticketUrl: string }>;
  executeAction(caseId: string, action: SuggestedAction): Promise<string>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  let jwt = config.getJwt();

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${config.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };

    let res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && config.onTokenRefresh) {
      jwt = await config.onTokenRefresh();
      res = await fetch(url, {
        method,
        headers: { ...headers, Authorization: `Bearer ${jwt}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({
        statusCode: res.status,
        error: 'UNKNOWN',
        message: res.statusText,
      }));
      throw err;
    }

    return res.json() as Promise<T>;
  }

  return {
    async createCase(message: string, context?: Record<string, unknown>) {
      return request<{ case: Case; snapshot: { id: string } }>('POST', '/api/cases', {
        message, ...(context ? { context } : {}),
      });
    },

    async sendMessage(caseId: string, content: string) {
      const data = await request<{ message: Message }>('POST', `/api/cases/${caseId}/messages`, { content });
      return data.message;
    },

    async addFeedback(caseId: string, feedback: 'positive' | 'negative') {
      await request<{ ok: true }>('POST', `/api/cases/${caseId}/feedback`, { feedback });
    },

    async escalate(caseId: string, reason?: string) {
      return request<{ ticketId: string; ticketUrl: string }>(
        'POST', `/api/cases/${caseId}/escalate`, { reason },
      );
    },

    async executeAction(caseId: string, action: SuggestedAction) {
      const data = await request<{ result: string }>(
        'POST', `/api/cases/${caseId}/actions`, { action },
      );
      return data.result;
    },
  };
}
