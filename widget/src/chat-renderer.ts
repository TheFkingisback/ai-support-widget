import type { Message, SuggestedAction } from './types.js';
import type { ApiClient } from './api.js';
import { renderEvidence } from './evidence.js';
import { renderActions, type ActionHandlers } from './actions.js';

export interface ChatRendererDeps {
  apiClient: ApiClient;
  locale: string;
  messagesEl: HTMLElement;
  panelEl: HTMLElement;
  caseId: string;
  onCaseClosed?: () => void;
  onSendMessage?: (text: string) => Promise<void>;
}

/** Renders a message element and appends to container */
export function renderMessage(msg: Message, deps: ChatRendererDeps): HTMLElement {
  const el = document.createElement('div');
  el.className = `ai-msg ${msg.role}`;
  el.dataset.messageId = msg.id;

  const textEl = document.createElement('span');
  textEl.textContent = msg.content;
  el.appendChild(textEl);

  if (msg.evidence.length > 0) {
    el.appendChild(renderEvidence(msg.evidence, deps.locale));
  }

  if (msg.actions.length > 0) {
    const handlers = createActionHandlers(deps);
    el.appendChild(renderActions(msg.actions, handlers, deps.panelEl));
  }

  if (msg.role === 'assistant') {
    el.appendChild(createFeedbackButtons(deps));
  }

  return el;
}

function createFeedbackButtons(deps: ChatRendererDeps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ai-case-close';

  const question = document.createElement('p');
  question.textContent = 'Was your issue resolved?';
  container.appendChild(question);

  const btns = document.createElement('div');
  btns.className = 'ai-case-close-btns';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'ai-close-yes';
  yesBtn.textContent = 'Yes';
  yesBtn.setAttribute('aria-label', 'Issue was resolved');

  const noBtn = document.createElement('button');
  noBtn.className = 'ai-close-no';
  noBtn.textContent = 'No';
  noBtn.setAttribute('aria-label', 'Issue was not resolved');

  yesBtn.addEventListener('click', () => showRatingStep(container, 'resolved', deps));
  noBtn.addEventListener('click', () => handleUnresolved(container, deps));

  btns.appendChild(yesBtn);
  btns.appendChild(noBtn);
  container.appendChild(btns);
  return container;
}

function handleUnresolved(container: HTMLElement, deps: ChatRendererDeps): void {
  container.innerHTML = '';
  const msg = document.createElement('p');
  msg.textContent = 'I\'ll keep trying to help. Please describe what\'s still wrong.';
  container.appendChild(msg);

  const closeAnyway = document.createElement('button');
  closeAnyway.className = 'ai-close-no';
  closeAnyway.textContent = 'Close case anyway';
  closeAnyway.style.marginTop = '8px';
  closeAnyway.addEventListener('click', () => showRatingStep(container, 'unresolved', deps));
  container.appendChild(closeAnyway);

  if (deps.onSendMessage) {
    deps.onSendMessage('My issue is not resolved yet. Please try a different approach.');
  }
  deps.messagesEl.scrollTop = deps.messagesEl.scrollHeight;
}

function showRatingStep(
  container: HTMLElement,
  resolution: 'resolved' | 'unresolved',
  deps: ChatRendererDeps,
): void {
  container.innerHTML = '';
  const label = document.createElement('p');
  label.textContent = 'How would you rate this experience? (1-10)';
  container.appendChild(label);

  const ratingRow = document.createElement('div');
  ratingRow.className = 'ai-rating';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.textContent = String(i);
    btn.setAttribute('aria-label', `Rate ${i} out of 10`);
    btn.addEventListener('click', () => submitClose(container, resolution, i, deps));
    ratingRow.appendChild(btn);
  }
  container.appendChild(ratingRow);
  deps.messagesEl.scrollTop = deps.messagesEl.scrollHeight;
}

async function submitClose(
  container: HTMLElement,
  resolution: 'resolved' | 'unresolved',
  rating: number,
  deps: ChatRendererDeps,
): Promise<void> {
  container.innerHTML = '';
  const loading = document.createElement('p');
  loading.textContent = 'Closing case...';
  container.appendChild(loading);

  try {
    await deps.apiClient.closeCase(deps.caseId, resolution, rating);
    container.innerHTML = '';
    const thanks = document.createElement('p');
    thanks.textContent = 'Thanks for your feedback! Case closed.';
    container.appendChild(thanks);
    if (deps.onCaseClosed) {
      setTimeout(() => deps.onCaseClosed!(), 2000);
    }
  } catch {
    container.innerHTML = '';
    const err = document.createElement('p');
    err.textContent = 'Failed to close case. Please try again.';
    container.appendChild(err);
  }
}

function createActionHandlers(deps: ChatRendererDeps): ActionHandlers {
  const { apiClient, caseId } = deps;
  return {
    async onRetry(action: SuggestedAction) {
      const result = await apiClient.executeAction(caseId, action);
      addSystemMessage(result, deps);
    },
    onOpenDocs(action: SuggestedAction) {
      const url = action.payload['url'] as string | undefined;
      if (url) window.open(url, '_blank', 'noopener');
    },
    async onCreateTicket(_action: SuggestedAction) {
      const result = await apiClient.escalate(caseId);
      addSystemMessage(`Ticket created: ${result.ticketId}`, deps);
    },
    async onRequestAccess(action: SuggestedAction) {
      const result = await apiClient.executeAction(caseId, action);
      addSystemMessage(result, deps);
    },
    async onCustom(action: SuggestedAction) {
      const result = await apiClient.executeAction(caseId, action);
      addSystemMessage(result, deps);
    },
  };
}

function addSystemMessage(text: string, deps: ChatRendererDeps): void {
  const el = document.createElement('div');
  el.className = 'ai-msg system';
  el.textContent = text;
  deps.messagesEl.appendChild(el);
  deps.messagesEl.scrollTop = deps.messagesEl.scrollHeight;
}
