/** CSS-in-JS styles injected into Shadow DOM */
export function getStyles(theme: 'light' | 'dark'): string {
  const isLight = theme === 'light';
  return `
    :host {
      --ai-support-primary: ${isLight ? '#2563eb' : '#60a5fa'};
      --ai-support-bg: ${isLight ? '#ffffff' : '#1e1e2e'};
      --ai-support-text: ${isLight ? '#1a1a2e' : '#e4e4e7'};
      --ai-support-radius: 12px;
      --ai-support-surface: ${isLight ? '#f4f4f5' : '#2a2a3e'};
      --ai-support-border: ${isLight ? '#e4e4e7' : '#3a3a4e'};
      --ai-support-muted: ${isLight ? '#71717a' : '#a1a1aa'};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--ai-support-text);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .ai-widget-fab {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: var(--ai-support-primary); color: #fff;
      border: none; cursor: pointer; font-size: 24px; display: flex;
      align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.2);
      z-index: 2147483647; transition: transform .2s;
    }
    .ai-widget-fab.left { right: auto; left: 20px; }
    .ai-widget-fab:hover { transform: scale(1.08); }
    .ai-widget-panel {
      position: fixed; bottom: 88px; right: 20px; width: 380px; max-height: 560px;
      background: var(--ai-support-bg); border-radius: var(--ai-support-radius);
      box-shadow: 0 8px 32px rgba(0,0,0,.18); display: flex; flex-direction: column;
      overflow: hidden; z-index: 2147483647; border: 1px solid var(--ai-support-border);
    }
    .ai-widget-panel.left { right: auto; left: 20px; }
    .ai-widget-panel.hidden { display: none; }
    .ai-widget-header {
      display: flex; align-items: center; padding: 14px 16px; gap: 8px;
      background: var(--ai-support-primary); color: #fff;
    }
    .ai-widget-header-title { flex: 1; font-weight: 600; font-size: 15px; }
    .ai-widget-header button {
      background: none; border: none; color: #fff; cursor: pointer;
      font-size: 13px; padding: 4px 8px; border-radius: 4px; opacity: .9;
    }
    .ai-widget-header button:hover { opacity: 1; background: rgba(255,255,255,.15); }
    .ai-widget-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex;
      flex-direction: column; gap: 8px; min-height: 200px;
    }
    .ai-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; word-break: break-word; }
    .ai-msg.user {
      align-self: flex-end; background: var(--ai-support-primary); color: #fff;
      border-bottom-right-radius: 4px;
    }
    .ai-msg.assistant {
      align-self: flex-start; background: var(--ai-support-surface);
      border-bottom-left-radius: 4px;
    }
    .ai-msg.system {
      align-self: center; color: var(--ai-support-muted); font-size: 12px;
      font-style: italic;
    }
    .ai-typing { align-self: flex-start; color: var(--ai-support-muted); font-style: italic; padding: 8px; }
    .ai-evidence { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ai-evidence-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
      border-radius: 4px; font-size: 12px; font-family: monospace;
    }
    .ai-evidence-badge.error_code { background: #fef2f2; color: #dc2626; }
    .ai-evidence-badge.job_id { background: #f0fdf4; color: #16a34a; cursor: pointer; }
    .ai-evidence-badge.timestamp { background: #eff6ff; color: #2563eb; }
    .ai-evidence-badge.resource_id { background: #fefce8; color: #ca8a04; }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%; background: #1e1e2e; color: #d4d4d8;
      padding: 8px; border-radius: 6px; white-space: pre-wrap; font-size: 11px;
    }
    .ai-actions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .ai-action-btn {
      padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
      border: 1px solid var(--ai-support-border); background: var(--ai-support-bg);
      color: var(--ai-support-text); transition: background .15s;
    }
    .ai-action-btn:hover { background: var(--ai-support-surface); }
    .ai-action-btn.create_ticket { border-color: var(--ai-support-danger); color: var(--ai-support-danger); }
    .ai-feedback { display: flex; gap: 4px; margin-top: 6px; }
    .ai-feedback button {
      background: none; border: 1px solid var(--ai-support-border); border-radius: 4px;
      padding: 2px 8px; cursor: pointer; font-size: 14px; color: var(--ai-support-muted);
    }
    .ai-feedback button:hover { background: var(--ai-support-surface); }
    .ai-widget-input {
      display: flex; padding: 10px 12px; gap: 8px; border-top: 1px solid var(--ai-support-border);
    }
    .ai-widget-input input {
      flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--ai-support-border);
      background: var(--ai-support-bg); color: var(--ai-support-text); font-size: 14px; outline: none;
    }
    .ai-widget-input input:focus { border-color: var(--ai-support-primary); }
    .ai-widget-input button {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
      background: var(--ai-support-primary); color: #fff; font-size: 14px; font-weight: 500;
    }
    .ai-widget-input button:disabled { opacity: .5; cursor: not-allowed; }
    .ai-confirm-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex;
      align-items: center; justify-content: center; z-index: 10;
    }
    .ai-confirm-box {
      background: var(--ai-support-bg); padding: 20px; border-radius: 12px;
      max-width: 280px; text-align: center;
    }
    .ai-confirm-box p { margin-bottom: 12px; }
    .ai-confirm-box button { margin: 0 4px; padding: 6px 16px; border-radius: 6px; cursor: pointer; border: none; }
    .ai-confirm-yes { background: var(--ai-support-danger); color: #fff; }
    .ai-confirm-no { background: var(--ai-support-surface); color: var(--ai-support-text); }
    @media (max-width: 420px) {
      .ai-widget-panel { width: calc(100vw - 20px); right: 10px; bottom: 80px; max-height: 70vh; }
      .ai-widget-panel.left { left: 10px; }
    }
  `;
}
