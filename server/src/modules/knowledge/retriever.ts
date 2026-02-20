import { log } from '../../shared/logger.js';
import type { EmbeddingClient } from './embeddings.js';
import type { KnowledgeDoc } from '../../../../shared/types.js';

export interface ChunkWithMeta {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  // Joined from document
  docTitle: string;
  docCategory: string;
  tenantId: string;
}

export interface ChunkStore {
  getAllChunksForTenant(tenantId: string): Promise<ChunkWithMeta[]>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export interface Retriever {
  search(
    tenantId: string,
    query: string,
    limit: number,
    requestId?: string,
  ): Promise<KnowledgeDoc[]>;
}

export function createRetriever(
  chunkStore: ChunkStore,
  embeddingClient: EmbeddingClient,
): Retriever {
  return {
    async search(tenantId, query, limit, requestId) {
      log.info('retriever: search', requestId, { tenantId, query: query.slice(0, 100), limit });

      const queryEmbedding = await embeddingClient.generateEmbedding(query, requestId);
      const chunks = await chunkStore.getAllChunksForTenant(tenantId);

      const scored = chunks.map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      scored.sort((a, b) => b.score - a.score);

      // Deduplicate by documentId (keep highest-scoring chunk per doc)
      const seenDocs = new Set<string>();
      const results: KnowledgeDoc[] = [];

      for (const { chunk, score } of scored) {
        if (seenDocs.has(chunk.documentId)) continue;
        seenDocs.add(chunk.documentId);

        results.push({
          id: chunk.documentId,
          title: chunk.docTitle,
          content: chunk.content,
          category: chunk.docCategory,
        });

        if (results.length >= limit) break;
      }

      const topScore = scored.length > 0 ? scored[0].score : 0;
      log.info('retriever: results', requestId, {
        tenantId,
        resultsCount: results.length,
        topScore: Math.round(topScore * 1000) / 1000,
      });

      return results;
    },
  };
}
