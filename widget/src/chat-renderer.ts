import type { Message, SuggestedAction } from './types.js';
import type { ApiClient } from './api.js';
import { renderEvidence } from './evidence.js';
import { widgetCopy } from './copy.js';
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

/** Renders a message element */
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
    el.appendChild(renderActions(msg.actions, handlers, deps.panelEl, deps.locale));
  }

  return el;
}

/** Creates the close-case flow UI (called when user clicks "End Session") */
export function createCloseFlow(deps: ChatRendererDeps): HTMLElement {
  const copy = widgetCopy(deps.locale);
  const container = document.createElement('div');
  container.className = 'ai-case-close';

  const question = document.createElement('p');
  question.textContent = copy.resolved;
  container.appendChild(question);

  const btns = document.createElement('div');
  btns.className = 'ai-case-close-btns';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'ai-close-yes';
  yesBtn.textContent = copy.yes;
  yesBtn.setAttribute('aria-label', copy.resolvedLabel);

  const noBtn = document.createElement('button');
  noBtn.className = 'ai-close-no';
  noBtn.textContent = copy.no;
  noBtn.setAttribute('aria-label', copy.unresolvedLabel);

  yesBtn.addEventListener('click', () => showRatingStep(container, 'resolved', deps));
  noBtn.addEventListener('click', () => handleUnresolved(container, deps));

  btns.appendChild(yesBtn);
  btns.appendChild(noBtn);
  container.appendChild(btns);
  return container;
}

function handleUnresolved(container: HTMLElement, deps: ChatRendererDeps): void {
  showRatingStep(container, 'unresolved', deps);
}

function showRatingStep(
  container: HTMLElement,
  resolution: 'resolved' | 'unresolved',
  deps: ChatRendererDeps,
): void {
  const copy = widgetCopy(deps.locale);
  container.innerHTML = '';
  const label = document.createElement('p');
  label.textContent = copy.rating;
  container.appendChild(label);

  const ratingRow = document.createElement('div');
  ratingRow.className = 'ai-rating';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.textContent = String(i);
    btn.setAttribute('aria-label', copy.rateLabel(i));
    btn.addEventListener('click', () => submitClose(container, resolution, i, deps));
    ratingRow.appendChild(btn);
  }
  container.appendChild(ratingRow);
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = copy.skipRating;
  skip.addEventListener('click', () => void submitClose(container, resolution, undefined, deps));
  container.appendChild(skip);
  deps.messagesEl.scrollTop = deps.messagesEl.scrollHeight;
}

async function submitClose(
  container: HTMLElement,
  resolution: 'resolved' | 'unresolved',
  rating: number | undefined,
  deps: ChatRendererDeps,
): Promise<void> {
  const copy = widgetCopy(deps.locale);
  container.innerHTML = '';
  const loading = document.createElement('p');
  loading.textContent = copy.closing;
  container.appendChild(loading);

  try {
    await deps.apiClient.closeCase(deps.caseId, resolution, rating);
    container.innerHTML = '';
    const thanks = document.createElement('p');
    thanks.textContent = copy.closed;
    container.appendChild(thanks);
    if (deps.onCaseClosed) {
      setTimeout(() => deps.onCaseClosed!(), 2000);
    }
  } catch {
    container.innerHTML = '';
    const err = document.createElement('p');
    err.textContent = copy.closeFailed;
    container.appendChild(err);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = copy.retry;
    retry.addEventListener('click', () => void submitClose(container, resolution, rating, deps));
    container.appendChild(retry);
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
