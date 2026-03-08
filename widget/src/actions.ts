import type { SuggestedAction } from './types.js';

export interface ActionHandlers {
  onRetry: (action: SuggestedAction) => Promise<void>;
  onOpenDocs: (action: SuggestedAction) => void;
  onRequestAccess: (action: SuggestedAction) => Promise<void>;
  onCustom: (action: SuggestedAction) => Promise<void>;
}

const DESTRUCTIVE_TYPES = new Set<string>();

/** Renders suggested action buttons below AI messages */
export function renderActions(
  actions: SuggestedAction[],
  handlers: ActionHandlers,
  panelEl: HTMLElement,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ai-actions';

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = `ai-action-btn ${action.type}`;
    btn.textContent = action.label;

    btn.addEventListener('click', () => {
      if (DESTRUCTIVE_TYPES.has(action.type)) {
        showConfirmation(panelEl, action.label, () => dispatchAction(action, handlers));
      } else {
        dispatchAction(action, handlers);
      }
    });

    container.appendChild(btn);
  }

  return container;
}

function dispatchAction(action: SuggestedAction, handlers: ActionHandlers): void {
  switch (action.type) {
    case 'retry':
      handlers.onRetry(action);
      break;
    case 'open_docs': {
      handlers.onOpenDocs(action);
      break;
    }
    case 'request_access':
      handlers.onRequestAccess(action);
      break;
    default:
      handlers.onCustom(action);
  }
}

function showConfirmation(panelEl: HTMLElement, label: string, onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'ai-confirm-overlay';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Confirm: ${label}`);

  const box = document.createElement('div');
  box.className = 'ai-confirm-box';

  const msg = document.createElement('p');
  msg.id = 'ai-confirm-msg';
  msg.textContent = `Are you sure you want to "${label}"?`;
  overlay.setAttribute('aria-describedby', 'ai-confirm-msg');
  box.appendChild(msg);

  const dismiss = () => overlay.remove();

  const yesBtn = document.createElement('button');
  yesBtn.className = 'ai-confirm-yes';
  yesBtn.textContent = 'Yes';
  yesBtn.addEventListener('click', () => { dismiss(); onConfirm(); });

  const noBtn = document.createElement('button');
  noBtn.className = 'ai-confirm-no';
  noBtn.textContent = 'Cancel';
  noBtn.addEventListener('click', dismiss);

  // Focus trap: Tab cycles between Yes and Cancel
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { dismiss(); return; }
    if (e.key === 'Tab') {
      const active = overlay.getRootNode() instanceof ShadowRoot
        ? (overlay.getRootNode() as ShadowRoot).activeElement
        : document.activeElement;
      if (e.shiftKey && active === noBtn) { e.preventDefault(); yesBtn.focus(); }
      else if (!e.shiftKey && active === yesBtn) { e.preventDefault(); noBtn.focus(); }
    }
  });

  box.appendChild(yesBtn);
  box.appendChild(noBtn);
  overlay.appendChild(box);
  panelEl.appendChild(overlay);
  noBtn.focus();
}
