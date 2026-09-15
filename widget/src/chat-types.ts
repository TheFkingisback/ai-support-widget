import type { ApiClient } from './api.js';
import type { Message } from './types.js';

export interface ChatPanelConfig {
  apiClient: ApiClient;
  locale: string;
  position: 'bottom-right' | 'bottom-left';
  onClose: () => void;
  onCaseClosed?: () => void;
  context?: Record<string, unknown>;
  getContext?: () => Record<string, unknown> | undefined;
  initialCaseId?: string;
  initialMessages?: Message[];
  onCaseCreated?: (caseId: string) => void;
}

export interface ChatPanel {
  element: HTMLElement;
  destroy(): void;
  focus(): void;
  hide(): void;
  show(): void;
}
