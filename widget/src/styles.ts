/** CSS-in-JS styles injected into Shadow DOM */
export function getStyles(theme: 'light' | 'dark', brandColor?: string): string {
  const isLight = theme === 'light';
  const primary = brandColor ?? (isLight ? '#2563eb' : '#60a5fa');
  const focus = brandColor ?? (isLight ? '#2563eb' : '#60a5fa');
  return `
    :host {
      --ai-support-primary: ${primary};
      --ai-support-bg: ${isLight ? '#ffffff' : '#1e1e2e'};
      --ai-support-text: ${isLight ? '#1a1a2e' : '#e4e4e7'};
      --ai-support-radius: 12px;
      --ai-support-surface: ${isLight ? '#f4f4f5' : '#2a2a3e'};
      --ai-support-border: ${isLight ? '#e4e4e7' : '#3a3a4e'};
      --ai-support-muted: ${isLight ? '#5c5c66' : '#a1a1aa'};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${focus};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--ai-support-text);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    *:focus-visible {
      outline: 2px solid var(--ai-support-focus);
      outline-offset: 2px;
    }
    .ai-widget-fab {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: var(--ai-support-primary); color: #fff;
      border: none; cursor: pointer; font-size: 24px; display: flex;
      align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.2);
      z-index: 2147483647; transition: transform .2s ease-in-out;
    }
    .ai-widget-fab.left { right: auto; left: 20px; }
    .ai-widget-fab:hover { transform: scale(1.08); }
    .ai-widget-fab:active { transform: scale(0.95); }
    .ai-widget-panel {
      position: fixed; bottom: 88px; right: 20px; width: 440px; max-height: 620px;
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
    .ai-widget-header-title { flex: 1; font-weight: 600; font-size: 15px; margin: 0; }
    .ai-widget-header button {
      background: none; border: none; color: #fff; cursor: pointer;
      font-size: 13px; padding: 4px 8px; border-radius: 4px; opacity: .9;
      transition: opacity .15s ease-in-out, background .15s ease-in-out;
    }
    .ai-widget-header button:hover { opacity: 1; background: rgba(255,255,255,.15); }
    .ai-widget-header button:focus-visible { outline-color: #fff; }
    .ai-end-btn { font-size: 11px !important; opacity: .7; }
    .ai-widget-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex;
      flex-direction: column; gap: 8px; min-height: 200px;
    }
    .ai-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      word-break: break-word; overflow-wrap: break-word;
      white-space: pre-wrap; font-size: 14px; line-height: 1.5;
    }
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
      font-style: italic; white-space: normal;
    }
    .ai-typing {
      align-self: flex-start; color: var(--ai-support-muted);
      font-style: italic; padding: 8px; font-size: 13px;
    }
    .ai-evidence { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ai-evidence-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
      border-radius: var(--ai-support-radius); font-size: 12px; font-family: monospace;
    }
    .ai-evidence-badge.error_code {
      background: ${isLight ? '#fef2f2' : 'rgba(239,68,68,.15)'};
      color: ${isLight ? '#dc2626' : '#fca5a5'};
    }
    .ai-evidence-badge.job_id {
      background: ${isLight ? '#f0fdf4' : 'rgba(34,197,94,.15)'};
      color: ${isLight ? '#16a34a' : '#86efac'};
      cursor: pointer;
    }
    .ai-evidence-badge.timestamp {
      background: ${isLight ? '#eff6ff' : 'rgba(96,165,250,.15)'};
      color: ${isLight ? '#2563eb' : '#93c5fd'};
    }
    .ai-evidence-badge.resource_id {
      background: ${isLight ? '#fefce8' : 'rgba(234,179,8,.15)'};
      color: ${isLight ? '#ca8a04' : '#fde047'};
    }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%;
      background: ${isLight ? '#f8fafc' : '#1e1e2e'};
      color: ${isLight ? '#334155' : '#d4d4d8'};
      padding: 8px; border-radius: 6px; white-space: pre-wrap; font-size: 11px;
      border: 1px solid var(--ai-support-border);
    }
    .ai-actions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .ai-action-btn {
      padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
      border: 1px solid var(--ai-support-border); background: var(--ai-support-bg);
      color: var(--ai-support-text); transition: background .15s ease-in-out;
    }
    .ai-action-btn:hover { background: var(--ai-support-surface); }
    .ai-action-btn:active { transform: scale(0.97); }
    .ai-action-btn.create_ticket {
      border-color: var(--ai-support-danger); color: var(--ai-support-danger);
    }
    .ai-case-close { margin-top: 8px; padding: 8px; border-radius: 8px;
      background: var(--ai-support-surface); text-align: center;
    }
    .ai-case-close p { font-size: 13px; margin-bottom: 8px; color: var(--ai-support-text); }
    .ai-case-close-btns { display: flex; gap: 8px; justify-content: center; }
    .ai-case-close-btns button {
      padding: 6px 16px; border-radius: 6px; cursor: pointer; border: none;
      font-size: 13px; font-weight: 500; transition: opacity .15s ease-in-out;
    }
    .ai-case-close-btns button:hover { opacity: .85; }
    .ai-close-yes { background: var(--ai-support-success); color: #fff; }
    .ai-close-no { background: var(--ai-support-danger); color: #fff; }
    .ai-rating { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
    .ai-rating button {
      width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--ai-support-border); background: var(--ai-support-bg);
      color: var(--ai-support-text); font-size: 13px; font-weight: 600;
      transition: background .15s ease-in-out;
    }
    .ai-rating button:hover { background: var(--ai-support-primary); color: #fff; }
    .ai-widget-input {
      display: flex; padding: 10px 12px; gap: 8px;
      border-top: 1px solid var(--ai-support-border);
    }
    .ai-widget-input input {
      flex: 1; padding: 8px 12px; border-radius: 8px;
      border: 1px solid var(--ai-support-border);
      background: var(--ai-support-bg); color: var(--ai-support-text);
      font-size: 14px; transition: border-color .15s ease-in-out;
    }
    .ai-widget-input input:hover { border-color: var(--ai-support-muted); }
    .ai-widget-input input:focus {
      border-color: var(--ai-support-primary);
      outline: 2px solid var(--ai-support-focus); outline-offset: 1px;
    }
    .ai-widget-input button {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
      background: var(--ai-support-primary); color: #fff;
      font-size: 14px; font-weight: 500;
      transition: opacity .15s ease-in-out;
    }
    .ai-widget-input button:hover { opacity: .9; }
    .ai-widget-input button:active { opacity: .8; }
    .ai-widget-input button:disabled { opacity: .5; cursor: not-allowed; }
    .ai-confirm-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex;
      align-items: center; justify-content: center; z-index: 10;
    }
    .ai-confirm-box {
      background: var(--ai-support-bg); padding: 20px; border-radius: 12px;
      max-width: 280px; text-align: center;
      border: 1px solid var(--ai-support-border);
    }
    .ai-confirm-box p { margin-bottom: 12px; font-size: 14px; }
    .ai-confirm-box button {
      margin: 0 4px; padding: 6px 16px; border-radius: 6px; cursor: pointer;
      border: none; font-size: 13px; font-weight: 500;
      transition: opacity .15s ease-in-out;
    }
    .ai-confirm-box button:hover { opacity: .9; }
    .ai-confirm-box button:active { opacity: .8; }
    .ai-confirm-yes { background: var(--ai-support-danger); color: #fff; }
    .ai-confirm-no { background: var(--ai-support-surface); color: var(--ai-support-text); }
    @media (max-width: 480px) {
      .ai-widget-panel {
        width: calc(100vw - 24px); right: 12px; bottom: 80px; max-height: 75vh;
      }
      .ai-widget-panel.left { left: 12px; }
      .ai-msg { max-width: 90%; }
      .ai-widget-header button { min-height: 44px; min-width: 44px; }
      .ai-widget-input button { min-height: 44px; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; animation: none !important; }
    }
    @media (forced-colors: active) {
      .ai-widget-fab, .ai-action-btn, .ai-confirm-yes, .ai-confirm-no {
        border: 2px solid ButtonText;
      }
    }
  `;
}
