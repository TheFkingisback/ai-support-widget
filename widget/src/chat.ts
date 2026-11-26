import type { ChatPanelConfig, ChatPanel } from './chat-types.js';
import { widgetCopy } from './copy.js';
export type { ChatPanelConfig, ChatPanel } from './chat-types.js';
import type { Message } from './types.js';
import { renderMessage, createCloseFlow, type ChatRendererDeps } from './chat-renderer.js';

export function createChatPanel(config: ChatPanelConfig): ChatPanel {
  const { apiClient, locale, position, onClose } = config;
  const copy = widgetCopy(locale);
  const isLeft = position === 'bottom-left';

  const panel = document.createElement('div');
  panel.className = `ai-widget-panel${isLeft ? ' left' : ''}`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', copy.chat);

  // Header
  const header = document.createElement('div');
  header.className = 'ai-widget-header';
  const title = document.createElement('h2');
  title.className = 'ai-widget-header-title';
  title.textContent = copy.support;
  title.id = 'ai-widget-title';
  panel.setAttribute('aria-labelledby', 'ai-widget-title');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ai-close-btn';
  closeBtn.textContent = '\u2715';
  closeBtn.setAttribute('aria-label', copy.minimize);
  closeBtn.addEventListener('click', onClose);
  const endBtn = document.createElement('button');
  endBtn.className = 'ai-end-btn';
  endBtn.textContent = copy.end;
  endBtn.setAttribute('aria-label', copy.endLabel);
  endBtn.style.display = 'none';
  header.appendChild(title);
  if (config.handoffUrl) {
    const support = document.createElement('a');
    support.href = config.handoffUrl;
    support.textContent = copy.humanHelp;
    support.className = 'ai-widget-handoff';
    support.target = '_blank';
    support.rel = 'noopener noreferrer';
    header.appendChild(support);
  }
  header.appendChild(endBtn);
  header.appendChild(closeBtn);

  // Messages
  const messagesEl = document.createElement('div');
  messagesEl.className = 'ai-widget-messages';
  messagesEl.setAttribute('role', 'log');
  messagesEl.setAttribute('aria-live', 'polite');
  messagesEl.setAttribute('aria-label', copy.messages);

  // Input
  const inputBar = document.createElement('div');
  inputBar.className = 'ai-widget-input';
  inputBar.setAttribute('role', 'form');
  inputBar.setAttribute('aria-label', copy.composer);
  const input = document.createElement('input');
  input.type = 'text';
  input.dir = 'auto';
  input.placeholder = copy.placeholder;
  input.setAttribute('aria-label', copy.messageLabel);
  const sendBtn = document.createElement('button');
  sendBtn.textContent = copy.send;
  sendBtn.setAttribute('aria-label', copy.sendLabel);
  inputBar.appendChild(input);
  inputBar.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputBar);

  const suggestion = document.createElement('details');
  suggestion.className = 'ai-suggestion';
  const summary = document.createElement('summary');
  summary.textContent = copy.suggest;
  const ideaForm = document.createElement('form');
  const idea = document.createElement('textarea');
  idea.dir = 'auto';
  idea.required = true;
  idea.maxLength = 2000;
  idea.placeholder = copy.suggestPrompt;
  idea.setAttribute('aria-label', copy.suggestPrompt);
  const submitIdea = document.createElement('button');
  submitIdea.type = 'submit';
  submitIdea.textContent = copy.suggestSend;
  const ideaStatus = document.createElement('span');
  ideaStatus.setAttribute('role', 'status');
  ideaForm.append(idea, submitIdea, ideaStatus);
  suggestion.append(summary, ideaForm);
  panel.appendChild(suggestion);

  let caseId: string | null = config.initialCaseId ?? null;
  let sending = false;
  let lastAssistantMessageId: string | undefined;
  let closeFlowShown = false;
  suggestion.hidden = !caseId;
  ideaForm.addEventListener('submit', async event => {
    event.preventDefault();
    const content = idea.value.trim();
    if (!content || !caseId || submitIdea.disabled) return;
    submitIdea.disabled = true;
    idea.readOnly = true;
    ideaStatus.textContent = '';
    try {
      await apiClient.submitSuggestion(caseId, content);
      ideaStatus.textContent = copy.suggestSent;
      idea.value = '';
    } catch {
      ideaStatus.textContent = copy.suggestFailed;
    } finally {
      submitIdea.disabled = false;
      idea.readOnly = false;
    }
  });

  // Show "End Session" when there's an active case
  if (caseId) endBtn.style.display = '';

  endBtn.addEventListener('click', () => {
    if (!caseId || closeFlowShown) return;
    closeFlowShown = true;
    messagesEl.appendChild(createCloseFlow(getDeps()));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // Restore previous messages if resuming
  if (config.initialMessages && config.initialMessages.length > 0) {
    for (const msg of config.initialMessages) {
      appendRendered(msg);
    }
  }

  async function sendProgrammatic(text: string): Promise<void> {
    if (!caseId || sending) return;
    sending = true;
    const typing = showTyping();
    try {
      const aiMsg = await apiClient.sendMessage(caseId, text, lastAssistantMessageId);
      typing.remove();
      appendRendered(aiMsg);
    } catch {
      typing.remove();
      const errEl = document.createElement('div');
      errEl.className = 'ai-msg system';
      errEl.textContent = copy.responseFailed;
      messagesEl.appendChild(errEl);
    } finally {
      sending = false;
    }
  }

  function getDeps(): ChatRendererDeps {
    return {
      apiClient, locale, messagesEl, panelEl: panel,
      caseId: caseId ?? '',
      onCaseClosed: config.onCaseClosed,
      onSendMessage: sendProgrammatic,
    };
  }

  function showTyping(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ai-typing';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = copy.thinking;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function appendRendered(msg: Message): void {
    if (msg.role === 'assistant') lastAssistantMessageId = msg.id;
    messagesEl.appendChild(renderMessage(msg, getDeps()));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  let previousDraft: { text: string; id?: string; context?: Record<string, unknown> } | undefined;
  async function handleSend(): Promise<void> {
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.setAttribute('disabled', '');
    input.readOnly = true;
    messagesEl.querySelector('[data-send-error]')?.remove();

    const typing = showTyping();
    try {
      if (previousDraft?.text !== text) {
        const context = !caseId ? (config.getContext ? config.getContext() : config.context) : undefined;
        previousDraft = { text, id: globalThis.crypto?.randomUUID?.(), context: context && JSON.parse(JSON.stringify(context)) as Record<string, unknown> };
      }
      const turnId = previousDraft.id;
      let aiMsg: Message;
      if (!caseId) {
        const result = await apiClient.createCase(text, previousDraft.context, turnId);
        caseId = result.case.id;
        suggestion.hidden = false;
        config.onCaseCreated?.(caseId);
        endBtn.style.display = '';
        aiMsg = result.aiMessage ?? await apiClient.sendMessage(caseId, text, lastAssistantMessageId);
      } else {
        aiMsg = await apiClient.sendMessage(caseId, text, lastAssistantMessageId, turnId);
      }
      typing.remove();
      const userMsg: Message = {
        id: 'local_u', caseId, role: 'user', content: text,
        actions: [], evidence: [], confidence: null, createdAt: new Date().toISOString(),
      };
      appendRendered(userMsg);
      appendRendered(aiMsg);
      input.value = '';
      previousDraft = undefined;
    } catch (failure) {
      typing.remove();
      const unknown = failure && typeof failure === 'object' && 'error' in failure && failure.error === 'TURN_OUTCOME_UNKNOWN';
      const errEl = document.createElement('div');
      errEl.className = 'ai-msg system';
      errEl.dataset.sendError = '';
      errEl.setAttribute('role', 'status');
      errEl.textContent = unknown ? copy.turnResultUnknown : copy.sendFailed + ' ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = copy.retry;
      retry.addEventListener('click', () => void handleSend());
      if (!unknown) errEl.appendChild(retry);
      messagesEl.appendChild(errEl);
    } finally {
      sending = false;
      input.readOnly = false;
      sendBtn.removeAttribute('disabled');
    }
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) handleSend();
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onClose();
  });

  return {
    element: panel,
    destroy() { panel.remove(); },
    focus() { input.focus(); },
    hide() { panel.classList.add('hidden'); },
    show() { panel.classList.remove('hidden'); },
  };
}
