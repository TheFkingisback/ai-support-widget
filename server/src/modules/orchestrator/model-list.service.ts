import { log } from '../../shared/logger.js';
import type { OpenRouterModel } from '../../shared/types.js';

interface OpenRouterModelRaw {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModelRaw[];
}

export interface ModelListService {
  getModels(requestId?: string): Promise<OpenRouterModel[]>;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  models: OpenRouterModel[];
  fetchedAt: number;
}

function parseProvider(modelId: string): string {
  const slash = modelId.indexOf('/');
  return slash > 0 ? modelId.slice(0, slash) : 'unknown';
}

function parseModel(raw: OpenRouterModelRaw): OpenRouterModel {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    provider: parseProvider(raw.id),
    promptPricing: parseFloat(raw.pricing?.prompt ?? '0'),
    completionPricing: parseFloat(raw.pricing?.completion ?? '0'),
  };
}

export function createModelListService(apiKey: string): ModelListService {
  let cache: CacheEntry | null = null;

  async function fetchModels(requestId?: string): Promise<OpenRouterModel[]> {
    log.info('fetchModels: fetching from OpenRouter', requestId);
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter models API returned ${res.status}`);
    }

    const data = (await res.json()) as OpenRouterModelsResponse;
    const models = (data.data ?? []).map(parseModel);
    log.info('fetchModels: received models', requestId, { count: models.length });
    return models;
  }

  return {
    async getModels(requestId) {
      const now = Date.now();

      if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
        log.debug('getModels: returning cached models', requestId, {
          count: cache.models.length,
        });
        return cache.models;
      }

      try {
        const models = await fetchModels(requestId);
        cache = { models, fetchedAt: now };
        return models;
      } catch (err) {
        log.warn('getModels: fetch failed, returning stale cache', requestId, {
          error: err instanceof Error ? err.message : String(err),
          hasStalecache: !!cache,
        });

        if (cache) return cache.models;
        throw err;
      }
    },
  };
}
