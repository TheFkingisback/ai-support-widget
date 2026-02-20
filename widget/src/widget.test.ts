import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AISupportWidget } from './widget.js';
import type { WidgetConfig } from './types.js';

function getConfig(overrides?: Partial<WidgetConfig>): WidgetConfig {
  return {
    tenantKey: 'ten_test1',
    jwt: 'test-jwt-token',
    apiUrl: 'http://localhost:3000',
    theme: 'light',
    position: 'bottom-right',
    locale: 'en-US',
    ...overrides,
  };
}

function getShadow(): ShadowRoot {
  const host = document.getElementById('ai-support-widget');
  expect(host).toBeTruthy();
  return host!.shadowRoot!;
}

describe('Widget SDK', () => {
  afterEach(() => {
    const host = document.getElementById('ai-support-widget');
    if (host) host.remove();
  });

  // Test 1: Widget.init creates Shadow DOM container
  it('creates Shadow DOM container on init', () => {
    AISupportWidget.init(getConfig());
    const host = document.getElementById('ai-support-widget');
    expect(host).toBeTruthy();
    expect(host!.shadowRoot).toBeTruthy();
  });

  // Test 2: Widget.init renders chat button
  it('renders chat FAB button on init', () => {
    AISupportWidget.init(getConfig());
    const shadow = getShadow();
    const fab = shadow.querySelector('.ai-widget-fab');
    expect(fab).toBeTruthy();
    expect(fab!.textContent).toBeTruthy();
  });

  // Test 3: Chat panel opens on button click
  it('opens chat panel on FAB click', () => {
    AISupportWidget.init(getConfig());
    const shadow = getShadow();
    const fab = shadow.querySelector('.ai-widget-fab') as HTMLElement;
    fab.click();
    const panel = shadow.querySelector('.ai-widget-panel');
    expect(panel).toBeTruthy();
  });

  // Test 4: Chat panel closes on close button click
  it('closes chat panel on close button click', () => {
    AISupportWidget.init(getConfig());
    const shadow = getShadow();
    (shadow.querySelector('.ai-widget-fab') as HTMLElement).click();
    expect(shadow.querySelector('.ai-widget-panel')).toBeTruthy();

    const closeBtn = shadow.querySelector('.ai-close-btn') as HTMLElement;
    closeBtn.click();
    expect(shadow.querySelector('.ai-widget-panel')).toBeNull();
  });

  // Test 12: Styles are isolated in Shadow DOM
  it('isolates styles in Shadow DOM', () => {
    AISupportWidget.init(getConfig());
    const shadow = getShadow();
    const styleEl = shadow.querySelector('style');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--ai-support-primary');
    // Styles not in document head (isolated)
    const headStyles = document.querySelectorAll('style');
    for (const s of headStyles) {
      expect(s.textContent).not.toContain('--ai-support-primary');
    }
  });

  it('destroys widget and removes from DOM', () => {
    const instance = AISupportWidget.init(getConfig());
    expect(document.getElementById('ai-support-widget')).toBeTruthy();
    instance.destroy();
    expect(document.getElementById('ai-support-widget')).toBeNull();
  });
});
