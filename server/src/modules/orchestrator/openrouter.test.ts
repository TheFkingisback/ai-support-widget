import { describe, it, expect } from 'vitest';
import { resolveModel } from './openrouter.js';

describe('resolveModel', () => {
  it('returns fast model for fast policy', () => {
    const model = resolveModel('fast');
    expect(model).toBe('anthropic/claude-sonnet-4');
  });

  it('returns strong model for strong policy', () => {
    const model = resolveModel('strong');
    expect(model).toBe('anthropic/claude-sonnet-4.5');
  });

  it('returns fast model for auto policy', () => {
    const model = resolveModel('auto');
    expect(model).toBe('anthropic/claude-sonnet-4');
  });

  it('returns preferredModel when provided, ignoring policy', () => {
    const model = resolveModel('fast', 'openai/gpt-4o');
    expect(model).toBe('openai/gpt-4o');
  });

  it('returns preferredModel over strong policy', () => {
    const model = resolveModel('strong', 'meta/llama-3-70b');
    expect(model).toBe('meta/llama-3-70b');
  });

  it('falls back to policy when preferredModel is undefined', () => {
    const model = resolveModel('strong', undefined);
    expect(model).toBe('anthropic/claude-sonnet-4.5');
  });

  it('falls back to policy when preferredModel is empty string', () => {
    const model = resolveModel('fast', '');
    expect(model).toBe('anthropic/claude-sonnet-4');
  });
});
