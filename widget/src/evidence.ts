import type { Evidence } from './types.js';

/** Renders evidence blocks inline in AI messages */
export function renderEvidence(evidenceList: Evidence[], locale: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ai-evidence';

  for (const ev of evidenceList) {
    const badge = document.createElement('span');
    badge.className = `ai-evidence-badge ${ev.type}`;

    if (ev.type === 'error_code') {
      badge.textContent = `${ev.label}: ${ev.value}`;
    } else if (ev.type === 'job_id') {
      badge.textContent = `${ev.label}: ${ev.value}`;
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('aria-label', `Copy ${ev.label}: ${ev.value}`);
      const copyValue = () => {
        navigator.clipboard.writeText(ev.value).catch(() => {});
      };
      badge.addEventListener('click', copyValue);
      badge.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyValue(); }
      });
    } else if (ev.type === 'timestamp') {
      const date = new Date(ev.value);
      const formatted = date.toLocaleString(locale);
      badge.textContent = `${ev.label}: ${formatted}`;
    } else if (ev.type === 'log_excerpt') {
      badge.textContent = ev.value;
    } else {
      badge.textContent = `${ev.label}: ${ev.value}`;
    }

    container.appendChild(badge);
  }

  return container;
}
