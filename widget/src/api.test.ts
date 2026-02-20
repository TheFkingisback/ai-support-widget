import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from './api.js';
import { createMockApiClient, mockAssistantMessage, mockEvidence, mockActions } from './test-helpers.js';

describe('API Client', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
  });

  // Test 5: sendMessage calls correct API endpoint
  it('sendMessage calls correct API endpoint', async () => {
    const aiMsg = mockAssistantMessage();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: aiMsg }),
    });

    const client = createApiClient({
      apiUrl: 'http://localhost:3000',
      getJwt: () => 'test-jwt',
    });

    const result = await client.sendMessage('cas_test1', 'My upload failed');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/cases/cas_test1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ content: 'My upload failed' }),
      }),
    );
    expect(result.id).toBe('msg_ai1');
    expect(result.role).toBe('assistant');
  });

  // Test 9: Feedback buttons call feedback endpoint
  it('addFeedback calls feedback endpoint', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    const client = createApiClient({
      apiUrl: 'http://localhost:3000',
      getJwt: () => 'test-jwt',
    });

    await client.addFeedback('cas_test1', 'positive');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/cases/cas_test1/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ feedback: 'positive' }),
      }),
    );
  });

  // Test 10: "Talk to human" button triggers escalation
  it('escalate calls escalation endpoint', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ticketId: 'tkt_123', ticketUrl: 'https://tickets.example.com/tkt_123' }),
    });

    const client = createApiClient({
      apiUrl: 'http://localhost:3000',
      getJwt: () => 'test-jwt',
    });

    const result = await client.escalate('cas_test1', 'User requested human');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/cases/cas_test1/escalate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'User requested human' }),
      }),
    );
    expect(result.ticketId).toBe('tkt_123');
  });

  // Test 11: Widget handles 401 by calling onTokenRefresh
  it('retries with refreshed token on 401', async () => {
    const aiMsg = mockAssistantMessage();
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Expired' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ message: aiMsg }) });

    const onTokenRefresh = vi.fn().mockResolvedValue('new-jwt');

    const client = createApiClient({
      apiUrl: 'http://localhost:3000',
      getJwt: () => 'old-jwt',
      onTokenRefresh,
    });

    const result = await client.sendMessage('cas_test1', 'test');

    expect(onTokenRefresh).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // Second call should use new token
    const secondCall = fetchSpy.mock.calls[1];
    expect(secondCall[1].headers.Authorization).toBe('Bearer new-jwt');
    expect(result.id).toBe('msg_ai1');
  });
});
