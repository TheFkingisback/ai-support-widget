import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChatPanel } from './chat.js';
import { createMockApiClient, mockAssistantMessage, mockEvidence, mockActions } from './test-helpers.js';
import { renderEvidence } from './evidence.js';
import { renderActions } from './actions.js';
import type { ApiClient } from './api.js';

describe('Chat Panel', () => {
  let mockApi: ApiClient;

  beforeEach(() => {
    mockApi = createMockApiClient();
  });

  // Test 6: Typing indicator shows while waiting for response
  it('shows typing indicator while waiting for response', async () => {
    // Slow down createCase to observe typing indicator
    let resolveCreate: Function;
    const slowCreate = new Promise<ReturnType<ApiClient['createCase']>>((r) => {
      resolveCreate = r;
    });
    (mockApi.createCase as ReturnType<typeof vi.fn>).mockReturnValue(slowCreate);

    const panel = createChatPanel({
      apiClient: mockApi,
      locale: 'en-US',
      position: 'bottom-right',
      onClose: vi.fn(),
    });
    document.body.appendChild(panel.element);

    const input = panel.element.querySelector('input') as HTMLInputElement;
    const sendBtn = panel.element.querySelector('.ai-widget-input button') as HTMLButtonElement;
    input.value = 'Help me';
    sendBtn.click();

    // Typing indicator should be visible
    await new Promise((r) => setTimeout(r, 10));
    const typing = panel.element.querySelector('.ai-typing');
    expect(typing).toBeTruthy();
    expect(typing!.textContent).toContain('thinking');

    // Resolve and check typing removed
    resolveCreate!({
      case: { id: 'cas_1', tenantId: 'ten_1', userId: 'usr_1', status: 'active', snapshotId: 'scs_1', createdAt: '', updatedAt: '', resolvedAt: null, messageCount: 1, feedback: null },
      snapshot: { id: 'scs_1' },
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(panel.element.querySelector('.ai-typing')).toBeNull();

    panel.destroy();
  });
});

describe('Evidence Renderer', () => {
  // Test 7: AI message renders evidence blocks
  it('renders evidence blocks with correct types', () => {
    const evidence = mockEvidence();
    const el = renderEvidence(evidence, 'en-US');

    const badges = el.querySelectorAll('.ai-evidence-badge');
    expect(badges.length).toBe(4);

    const errorBadge = el.querySelector('.error_code');
    expect(errorBadge).toBeTruthy();
    expect(errorBadge!.textContent).toContain('UPLOAD_TOO_LARGE');

    const jobBadge = el.querySelector('.job_id');
    expect(jobBadge).toBeTruthy();
    expect(jobBadge!.textContent).toContain('job_abc123');

    const tsBadge = el.querySelector('.timestamp');
    expect(tsBadge).toBeTruthy();

    const logBadge = el.querySelector('.log_excerpt');
    expect(logBadge).toBeTruthy();
    expect(logBadge!.textContent).toContain('file size 52MB');
  });
});

describe('Action Buttons', () => {
  // Test 8: AI message renders action buttons
  it('renders action buttons with correct labels', () => {
    const actions = mockActions();
    const handlers = {
      onRetry: vi.fn().mockResolvedValue(undefined),
      onOpenDocs: vi.fn(),
      onCreateTicket: vi.fn().mockResolvedValue(undefined),
      onRequestAccess: vi.fn().mockResolvedValue(undefined),
      onCustom: vi.fn().mockResolvedValue(undefined),
    };
    const panel = document.createElement('div');
    const el = renderActions(actions, handlers, panel);

    const buttons = el.querySelectorAll('.ai-action-btn');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Retry upload');
    expect(buttons[1].textContent).toBe('View docs');
    expect(buttons[2].textContent).toBe('Create ticket');

    // Click retry — no confirmation needed
    (buttons[0] as HTMLElement).click();
    expect(handlers.onRetry).toHaveBeenCalledWith(actions[0]);

    // Click open_docs — no confirmation
    (buttons[1] as HTMLElement).click();
    expect(handlers.onOpenDocs).toHaveBeenCalledWith(actions[1]);

    // Click create_ticket — shows confirmation dialog
    (buttons[2] as HTMLElement).click();
    const confirm = panel.querySelector('.ai-confirm-overlay');
    expect(confirm).toBeTruthy();
    // handlers.onCreateTicket should NOT be called yet
    expect(handlers.onCreateTicket).not.toHaveBeenCalled();
    // Click yes
    const yesBtn = confirm!.querySelector('.ai-confirm-yes') as HTMLElement;
    yesBtn.click();
    expect(handlers.onCreateTicket).toHaveBeenCalledWith(actions[2]);
  });
});
