import type { ApiClient } from './api.js';
import type { Message } from './types.js';
import { renderMessage, type ChatRendererDeps } from './chat-renderer.js';

export interface ChatPanelConfig {
  apiClient: ApiClient;
  locale: string;
  position: 'bottom-right' | 'bottom-left';
  onClose: () => void;
  context?: Record<string, unknown>;
}

export interface ChatPanel {
  element: HTMLElement;
  destroy(): void;
  focus(): void;
}

export function createChatPanel(config: ChatPanelConfig): ChatPanel {
  const { apiClient, locale, position, onClose } = config;
  const isLeft = position === 'bottom-left';

  const panel = document.createElement('div');
  panel.className = `ai-widget-panel${isLeft ? ' left' : ''}`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Support chat');

  // Header
  const header = document.createElement('div');
  header.className = 'ai-widget-header';
  const title = document.createElement('h2');
  title.className = 'ai-widget-header-title';
  title.textContent = 'Support';
  title.id = 'ai-widget-title';
  panel.setAttribute('aria-labelledby', 'ai-widget-title');
  const escalateBtn = document.createElement('button');
  escalateBtn.className = 'ai-escalate-btn';
  escalateBtn.textContent = 'Talk to human';
  escalateBtn.setAttribute('aria-label', 'Escalate to human support');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ai-close-btn';
  closeBtn.textContent = '\u2715';
  closeBtn.setAttribute('aria-label', 'Close support chat');
  closeBtn.addEventListener('click', onClose);
  header.appendChild(title);
  header.appendChild(escalateBtn);
  header.appendChild(closeBtn);

  // Messages
  const messagesEl = document.createElement('div');
  messagesEl.className = 'ai-widget-messages';
  messagesEl.setAttribute('role', 'log');
  messagesEl.setAttribute('aria-live', 'polite');
  messagesEl.setAttribute('aria-label', 'Chat messages');

  // Input
  const inputBar = document.createElement('div');
  inputBar.className = 'ai-widget-input';
  inputBar.setAttribute('role', 'form');
  inputBar.setAttribute('aria-label', 'Send a message');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Describe your issue...';
  input.setAttribute('aria-label', 'Type your message');
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.setAttribute('aria-label', 'Send message');
  inputBar.appendChild(input);
  inputBar.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputBar);

  let caseId: string | null = null;
  let sending = false;

  function getDeps(): ChatRendererDeps {
    return { apiClient, locale, messagesEl, panelEl: panel, caseId: caseId ?? '' };
  }

  function showTyping(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ai-typing';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = 'AI is thinking...';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function appendRendered(msg: Message): void {
    messagesEl.appendChild(renderMessage(msg, getDeps()));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function handleSend(): Promise<void> {
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.setAttribute('disabled', '');
    input.value = '';

    const typing = showTyping();
    try {
      if (!caseId) {
        const result = await apiClient.createCase(text, config.context);
        caseId = result.case.id;
      }
      const aiMsg = await apiClient.sendMessage(caseId, text);
      typing.remove();
      const userMsg: Message = {
        id: 'local_u', caseId, role: 'user', content: text,
        actions: [], evidence: [], confidence: null, createdAt: new Date().toISOString(),
      };
      appendRendered(userMsg);
      appendRendered(aiMsg);
    } catch {
      typing.remove();
      const errEl = document.createElement('div');
      errEl.className = 'ai-msg system';
      errEl.textContent = 'Failed to send message. Please try again.';
      messagesEl.appendChild(errEl);
    } finally {
      sending = false;
      sendBtn.removeAttribute('disabled');
    }
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onClose();
  });

  escalateBtn.addEventListener('click', async () => {
    if (!caseId) return;
    try {
      const result = await apiClient.escalate(caseId, 'User requested human agent');
      const sysMsg = document.createElement('div');
      sysMsg.className = 'ai-msg system';
      sysMsg.textContent = `Escalated to human support. Ticket: ${result.ticketId}`;
      messagesEl.appendChild(sysMsg);
    } catch {
      const errEl = document.createElement('div');
      errEl.className = 'ai-msg system';
      errEl.textContent = 'Failed to escalate. Please try again.';
      messagesEl.appendChild(errEl);
    }
  });

  return {
    element: panel,
    destroy() { panel.remove(); },
    focus() { input.focus(); },
  };
}
