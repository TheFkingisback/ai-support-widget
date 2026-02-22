import { describe, it, expect, afterEach, vi } from 'vitest';
import { AISupportWidget } from './widget.js';
import { createChatPanel } from './chat.js';
import { renderEvidence } from './evidence.js';
import { renderActions } from './actions.js';
import { createMockApiClient, mockEvidence, mockActions } from './test-helpers.js';
import type { WidgetConfig } from './types.js';

function getConfig(overrides?: Partial<WidgetConfig>): WidgetConfig {
  return {
    tenantKey: 'ten_test1', jwt: 'test-jwt', apiUrl: 'http://localhost:3000',
    theme: 'light', position: 'bottom-right', locale: 'en-US', ...overrides,
  };
}

function getShadow(): ShadowRoot {
  return document.getElementById('ai-support-widget')!.shadowRoot!;
}

describe('A11y: FAB button', () => {
  afterEach(() => {
    document.getElementById('ai-support-widget')?.remove();
  });

  it('has aria-label and aria-expanded=false when closed', () => {
    AISupportWidget.init(getConfig());
    const fab = getShadow().querySelector('.ai-widget-fab')!;
    expect(fab.getAttribute('aria-label')).toBe('Open support chat');
    expect(fab.getAttribute('aria-expanded')).toBe('false');
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('updates aria-expanded and aria-label when opened', () => {
    const instance = AISupportWidget.init(getConfig());
    instance.open();
    const fab = getShadow().querySelector('.ai-widget-fab')!;
    expect(fab.getAttribute('aria-expanded')).toBe('true');
    expect(fab.getAttribute('aria-label')).toBe('Minimize support chat');
  });

  it('restores aria attributes when closed', () => {
    const instance = AISupportWidget.init(getConfig());
    instance.open();
    instance.close();
    const fab = getShadow().querySelector('.ai-widget-fab')!;
    expect(fab.getAttribute('aria-expanded')).toBe('false');
    expect(fab.getAttribute('aria-label')).toBe('Open support chat');
  });
});

describe('A11y: Chat panel', () => {
  it('has role=dialog and aria-labelledby', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    expect(panel.element.getAttribute('role')).toBe('dialog');
    expect(panel.element.getAttribute('aria-label')).toBe('Support chat');
    expect(panel.element.getAttribute('aria-labelledby')).toBe('ai-widget-title');
  });

  it('header title is h2 with id', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    const title = panel.element.querySelector('h2');
    expect(title).toBeTruthy();
    expect(title!.id).toBe('ai-widget-title');
  });

  it('close button has aria-label', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    const closeBtn = panel.element.querySelector('.ai-close-btn')!;
    expect(closeBtn.getAttribute('aria-label')).toBe('Minimize support chat');
  });

  it('messages container has role=log and aria-live', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    const msgs = panel.element.querySelector('.ai-widget-messages')!;
    expect(msgs.getAttribute('role')).toBe('log');
    expect(msgs.getAttribute('aria-live')).toBe('polite');
  });

  it('input has aria-label and form has role=form', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    const input = panel.element.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Type your message');
    const form = panel.element.querySelector('[role="form"]')!;
    expect(form.getAttribute('aria-label')).toBe('Send a message');
  });

  it('send button has aria-label', () => {
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose: vi.fn(),
    });
    const btn = panel.element.querySelector('.ai-widget-input button')!;
    expect(btn.getAttribute('aria-label')).toBe('Send message');
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    const panel = createChatPanel({
      apiClient: createMockApiClient(), locale: 'en-US',
      position: 'bottom-right', onClose,
    });
    document.body.appendChild(panel.element);
    panel.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
    panel.destroy();
  });
});

describe('A11y: Evidence badges', () => {
  it('job_id badge has role=button, tabindex, and aria-label', () => {
    const el = renderEvidence(mockEvidence(), 'en-US');
    const jobBadge = el.querySelector('.job_id')!;
    expect(jobBadge.getAttribute('role')).toBe('button');
    expect(jobBadge.getAttribute('tabindex')).toBe('0');
    expect(jobBadge.getAttribute('aria-label')).toContain('Copy');
    expect(jobBadge.getAttribute('aria-label')).toContain('job_abc123');
  });
});

describe('A11y: Confirmation dialog', () => {
  it('has role=alertdialog, aria-modal, and aria-describedby', () => {
    const panelEl = document.createElement('div');
    const handlers = {
      onRetry: vi.fn().mockResolvedValue(undefined),
      onOpenDocs: vi.fn(),
      onCreateTicket: vi.fn().mockResolvedValue(undefined),
      onRequestAccess: vi.fn().mockResolvedValue(undefined),
      onCustom: vi.fn().mockResolvedValue(undefined),
    };
    const actions = mockActions();
    const el = renderActions(actions, handlers, panelEl);
    // Click "Create ticket" to trigger confirmation
    const ticketBtn = el.querySelectorAll('.ai-action-btn')[2] as HTMLElement;
    ticketBtn.click();

    const overlay = panelEl.querySelector('.ai-confirm-overlay')!;
    expect(overlay.getAttribute('role')).toBe('alertdialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-describedby')).toBe('ai-confirm-msg');
    expect(overlay.getAttribute('aria-label')).toContain('Confirm');
  });
});
