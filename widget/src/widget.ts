import type { WidgetConfig } from './types.js';
import { getStyles } from './styles.js';
import { createApiClient, type ApiClient } from './api.js';
import { createChatPanel, type ChatPanel } from './chat.js';

export interface WidgetInstance {
  open(): void;
  close(): void;
  destroy(): void;
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
    const isLeft = position === 'bottom-left';

    // Create host element and shadow DOM
    const host = document.createElement('div');
    host.id = 'ai-support-widget';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles(theme);
    shadow.appendChild(styleEl);

    // Create API client
    let jwt = config.jwt;
    const apiClient: ApiClient = createApiClient({
      apiUrl: config.apiUrl,
      getJwt: () => jwt,
      onTokenRefresh: config.onTokenRefresh
        ? async () => {
            jwt = await config.onTokenRefresh!();
            return jwt;
          }
        : undefined,
    });

    // Create floating action button
    const fab = document.createElement('button');
    fab.className = `ai-widget-fab${isLeft ? ' left' : ''}`;
    fab.textContent = '\u{1F4AC}';
    fab.title = 'Open support';
    shadow.appendChild(fab);

    let chatPanel: ChatPanel | null = null;

    function open(): void {
      if (chatPanel) return;
      chatPanel = createChatPanel({
        apiClient,
        locale,
        position,
        onClose: close,
      });
      shadow.appendChild(chatPanel.element);
    }

    function close(): void {
      if (chatPanel) {
        chatPanel.destroy();
        chatPanel = null;
      }
    }

    function destroy(): void {
      close();
      host.remove();
      AISupportWidget.instance = null;
    }

    fab.addEventListener('click', () => {
      if (chatPanel) {
        close();
      } else {
        open();
      }
    });

    const instance: WidgetInstance = { open, close, destroy };
    AISupportWidget.instance = instance;
    return instance;
  }
}

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['AISupportWidget'] = AISupportWidget;
}
