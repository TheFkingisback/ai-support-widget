import { sessionIdentity } from './session-identity.js';
import type { WidgetConfig } from './types.js';
import { getStyles } from './styles.js';
import { createApiClient, type ApiClient } from './api.js';
import { createChatPanel, type ChatPanel } from './chat.js';
import { saveCaseId, loadCaseId, clearCaseId } from './persistence.js';

export interface WidgetInstance {
  open(): Promise<void>;
  close(): void;
  destroy(): void;
  /** Proactively push a fresh JWT into the widget (avoids 401 round-trip). */
  updateJwt(newJwt: string): void;
  /** Applies to the next case; existing conversation snapshots remain unchanged. */
  updateContext(context: Record<string, unknown>): void;
}

export class AISupportWidget {
  private static instance: WidgetInstance | null = null;

  static init(config: WidgetConfig): WidgetInstance {
    if (AISupportWidget.instance) {
      AISupportWidget.instance.destroy();
    }

    const theme = config.theme ?? 'light';
    const position = config.position ?? 'bottom-right';
    const locale = config.locale ?? 'en-US';
    const tenantKey = config.tenantKey;
    const identity = sessionIdentity(config.jwt, tenantKey);
    let disposed = false;
    let generation = 0;
    let opening: Promise<void> | null = null;
    const abort = new AbortController();
    try { localStorage.removeItem(`ai_support_${tenantKey}_caseId`); } catch { /* unavailable */ }
    const clearStored = () => { if (identity) clearCaseId(identity); };
    const saveStored = (id: string) => { if (!disposed && identity) saveCaseId(identity, id); };
    const isLeft = position === 'bottom-left';

    // Create host element and shadow DOM
    const host = document.createElement('div');
    host.id = 'ai-support-widget';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles(theme, config.brandColor);
    shadow.appendChild(styleEl);

    // Create API client
    let jwt = config.jwt;
    const apiClient: ApiClient = createApiClient({
      apiUrl: config.apiUrl,
      getJwt: () => jwt,
      signal: abort.signal,
      onTokenRefresh: config.onTokenRefresh
        ? async () => {
            const fresh = await config.onTokenRefresh!();
            updateJwt(fresh);
            return jwt;
          }
        : undefined,
    });

    // Create floating action button
    const fab = document.createElement('button');
    fab.className = `ai-widget-fab${isLeft ? ' left' : ''}`;
    fab.textContent = '\u{1F4AC}';
    fab.setAttribute('aria-label', 'Open support chat');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-haspopup', 'dialog');
    shadow.appendChild(fab);

    let chatPanel: ChatPanel | null = null;
    let panelVisible = false;

    function handleCaseClosed(): void {
      clearStored();
      if (chatPanel) {
        chatPanel.destroy();
        chatPanel = null;
      }
      panelVisible = false;
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open support chat');
    }

    function showPanel(panel: ChatPanel): void {
      shadow.appendChild(panel.element);
      panelVisible = true;
      fab.setAttribute('aria-expanded', 'true');
      fab.setAttribute('aria-label', 'Minimize support chat');
      panel.focus();
    }

    async function openPanel(): Promise<void> {
      const version = generation;
      if (config.onOpen) await config.onOpen();
      if (disposed || generation !== version) return;
      if (chatPanel && !panelVisible) {
        chatPanel.show();
        panelVisible = true;
        fab.setAttribute('aria-expanded', 'true');
        fab.setAttribute('aria-label', 'Minimize support chat');
        chatPanel.focus();
        return;
      }
      if (chatPanel) return;

      // Try to restore a previous session from localStorage
      const storedCaseId = identity ? loadCaseId(identity) : null;
      if (storedCaseId) {
        try {
          const { case: caseData, messages } = await apiClient.getCase(storedCaseId);
          if (disposed || generation !== version) return;
          if (caseData.status === 'active' && sessionIdentity(jwt, tenantKey) === identity) {
            chatPanel = createChatPanel({
              apiClient, locale, position,
              onClose: minimize, onCaseClosed: handleCaseClosed,
              getContext: () => config.context,
              initialCaseId: storedCaseId,
              initialMessages: messages,
              onCaseCreated: saveStored,
            });
            showPanel(chatPanel);
            return;
          }
          // Case is closed — clear and start fresh
          clearStored();
        } catch {
          // Case not found or error — clear and start fresh
          clearStored();
        }
      }

      if (disposed || generation !== version) return;
      chatPanel = createChatPanel({
        apiClient, locale, position,
        onClose: minimize, onCaseClosed: handleCaseClosed,
        getContext: () => config.context,
        onCaseCreated: saveStored,
      });
      showPanel(chatPanel);
    }

    function open(): Promise<void> {
      if (disposed) return Promise.reject(new Error('Support session closed'));
      if (opening) return opening;
      opening = openPanel().finally(() => { opening = null; });
      return opening;
    }

    function minimize(): void {
      if (chatPanel) {
        chatPanel.hide();
      }
      panelVisible = false;
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open support chat');
      fab.focus();
    }

    function close(): void {
      generation++;
      if (chatPanel) {
        chatPanel.destroy();
        chatPanel = null;
      }
      panelVisible = false;
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open support chat');
      fab.focus();
    }

    function destroy(): void {
      disposed = true;
      abort.abort();
      clearStored();
      close();
      host.remove();
      if (AISupportWidget.instance === instance) AISupportWidget.instance = null;
    }

    fab.addEventListener('click', () => {
      if (panelVisible) {
        minimize();
      } else {
        void open().catch(() => { fab.setAttribute('aria-label', 'Support unavailable. Try again.'); });
      }
    });

    function updateJwt(newJwt: string): void {
      if (disposed) throw new Error('Support session closed');
      if (sessionIdentity(newJwt, tenantKey) !== identity) {
        destroy();
        throw new Error('Support identity changed; initialize a new widget');
      }
      jwt = newJwt;
    }

    function updateContext(context: Record<string, unknown>): void {
      if (disposed) throw new Error('Support session closed');
      config.context = context;
    }

    const instance: WidgetInstance = { open, close, destroy, updateJwt, updateContext };
    AISupportWidget.instance = instance;
    return instance;
  }
}

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['AISupportWidget'] = AISupportWidget;
}
