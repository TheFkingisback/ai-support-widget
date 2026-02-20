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
  container.className = 'ai-feedback';

  const thumbsUp = document.createElement('button');
  thumbsUp.textContent = '\u{1F44D}';
  thumbsUp.title = 'Helpful';
  thumbsUp.addEventListener('click', () => {
    deps.apiClient.addFeedback(deps.caseId, 'positive').catch(() => {});
    container.textContent = 'Thanks for your feedback!';
  });

  const thumbsDown = document.createElement('button');
  thumbsDown.textContent = '\u{1F44E}';
  thumbsDown.title = 'Not helpful';
  thumbsDown.addEventListener('click', () => {
    deps.apiClient.addFeedback(deps.caseId, 'negative').catch(() => {});
    container.textContent = 'Thanks for your feedback!';
  });

  container.appendChild(thumbsUp);
  container.appendChild(thumbsDown);
  return container;
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
