import { describe, expect, it, vi } from 'vitest';
import { createChatPanel } from './chat.js';
import { createApiClient } from './api.js';
import { createMockApiClient, mockAssistantMessage } from './test-helpers.js';
describe('Chat confirmation binding', () => {
  it('binds typed confirmation to the proposal actually rendered in this tab, also after restore', async () => {
    const api = createMockApiClient(); const message = { ...mockAssistantMessage(), id: 'proposal_message', actions: [], evidence: [] };
    const panel = createChatPanel({ apiClient: api, locale: 'pt-BR', position: 'bottom-right', onClose: vi.fn(),
      initialCaseId: 'cas_1', initialMessages: [message] });
    document.body.appendChild(panel.element);
    const input = panel.element.querySelector('input')!; input.value = 'confirmar';
    panel.element.querySelector<HTMLButtonElement>('.ai-widget-input button')!.click();
    await vi.waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith('cas_1', 'confirmar', 'proposal_message'));
    panel.destroy();
  });
  it('preserves the proposal binding when refreshing the session token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: mockAssistantMessage() }) });
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({ apiUrl: 'https://support.example.com', getJwt: () => 'expired', onTokenRefresh: async () => 'renewed' });
    await api.sendMessage('cas_1', 'confirmar', 'proposal_1');
    for (const call of fetchMock.mock.calls) expect(JSON.parse(call[1].body)).toEqual({ content: 'confirmar', replyToMessageId: 'proposal_1' });
    vi.unstubAllGlobals();
  });
});
