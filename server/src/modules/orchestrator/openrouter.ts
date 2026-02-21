import { log } from '../../shared/logger.js';
import { LLMError } from '../../shared/errors.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  estimatedCost: number;
}

interface OpenRouterChoice {
  message: { role: string; content: string };
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}

const MODEL_MAP: Record<string, string> = {
  fast: 'anthropic/claude-sonnet-4-20250514',
  strong: 'anthropic/claude-opus-4-20250514',
};

export function resolveModel(
  policy: 'fast' | 'strong' | 'auto',
  preferredModel?: string,
): string {
  if (preferredModel) return preferredModel;
  if (policy === 'auto') return MODEL_MAP['fast'];
  return MODEL_MAP[policy];
}

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'anthropic/claude-opus-4-20250514': { input: 0.015, output: 0.075 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_1K[model];
  if (!rates) {
    log.warn('estimateCost: unknown model, defaulting to Sonnet pricing', undefined, { model });
    return (tokensIn / 1000) * 0.003 + (tokensOut / 1000) * 0.015;
  }
  return (tokensIn / 1000) * rates.input + (tokensOut / 1000) * rates.output;
}

export async function callLLM(
  params: LLMRequest,
  apiKey: string,
  requestId?: string,
): Promise<LLMResponse> {
  const { model, messages, maxTokens = 2048, temperature = 0.3 } = params;

  log.info('callLLM: sending request', requestId, {
    model,
    messageCount: messages.length,
    maxTokens,
  });

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status >= 500 && attempt === 0) {
        log.warn('callLLM: 5xx error, retrying', requestId, { status: res.status });
        lastError = new Error(`OpenRouter returned ${res.status}`);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => 'unknown');
        const safeText = text.slice(0, 200).replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
        throw new LLMError(`OpenRouter ${res.status}: ${safeText}`);
      }

      const data = (await res.json()) as OpenRouterResponse;
      const latencyMs = Date.now() - start;
      const tokensIn = data.usage?.prompt_tokens ?? 0;
      const tokensOut = data.usage?.completion_tokens ?? 0;
      const content = data.choices?.[0]?.message?.content ?? '';
      const cost = estimateCost(model, tokensIn, tokensOut);

      log.info('callLLM: response received', requestId, {
        model,
        tokensIn,
        tokensOut,
        latencyMs,
        estimatedCost: cost,
      });

      return { content, model, tokensIn, tokensOut, latencyMs, estimatedCost: cost };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof LLMError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));

      if (controller.signal.aborted) {
        log.error('callLLM: request timed out', requestId, { attempt });
        throw new LLMError('LLM request timed out after 30s');
      }

      if (attempt === 0) {
        log.warn('callLLM: error, retrying', requestId, { error: lastError.message });
        continue;
      }
    }
  }

  throw new LLMError(lastError?.message ?? 'LLM request failed after retries');
}
