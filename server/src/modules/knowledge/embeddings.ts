import { log } from '../../shared/logger.js';

const EMBEDDING_DIM = 1536;
const LRU_MAX = 200;

/** Simple LRU cache keyed by text hash */
const cache = new Map<string, number[]>();

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}

function lruPut(key: string, value: number[]): void {
  if (cache.size >= LRU_MAX) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
  }
  cache.set(key, value);
}

export interface EmbeddingClient {
  generateEmbedding(text: string, requestId?: string): Promise<number[]>;
}

export function createEmbeddingClient(apiKey: string): EmbeddingClient {
  return {
    async generateEmbedding(text: string, requestId?: string): Promise<number[]> {
      const key = hashText(text);
      const cached = cache.get(key);
      if (cached) {
        log.debug('embeddings: cache hit', requestId, { textLen: text.length });
        return cached;
      }

      const start = Date.now();
      log.info('embeddings: generating', requestId, { textLen: text.length });

      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Embedding API error ${res.status}: ${body}`);
      }

      const json = (await res.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      const embedding = json.data[0].embedding;
      const latencyMs = Date.now() - start;

      log.info('embeddings: done', requestId, {
        textLen: text.length,
        dimensions: embedding.length,
        latencyMs,
      });

      lruPut(key, embedding);
      return embedding;
    },
  };
}

export function clearEmbeddingCache(): void {
  cache.clear();
}

export { EMBEDDING_DIM };
