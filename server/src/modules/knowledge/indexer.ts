import crypto from 'node:crypto';
import { log } from '../../shared/logger.js';
import type { EmbeddingClient } from './embeddings.js';

const CHUNK_SIZE = 500; // ~500 tokens (approx 4 chars/token = 2000 chars)
const CHUNK_OVERLAP = 50; // ~50 tokens = 200 chars
const CHARS_PER_TOKEN = 4;

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export interface Document {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: string;
}

export interface DocumentStore {
  insertDocument(doc: Document): Promise<void>;
  insertChunk(chunk: DocumentChunk): Promise<void>;
  getDocumentsByTenant(tenantId: string): Promise<Document[]>;
  deleteChunksByDocumentId(documentId: string): Promise<void>;
}

export function chunkText(text: string): string[] {
  const chunkChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlapChars;
  }

  return chunks;
}

export interface Indexer {
  indexDocument(
    tenantId: string,
    title: string,
    content: string,
    category: string,
    requestId?: string,
  ): Promise<Document>;

  reindexAll(
    tenantId: string,
    requestId?: string,
  ): Promise<{ indexed: number }>;
}

async function embedAndStoreChunks(
  docId: string, content: string, store: DocumentStore,
  embeddingClient: EmbeddingClient, requestId?: string,
): Promise<number> {
  const chunks = chunkText(content);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embeddingClient.generateEmbedding(chunks[i], requestId);
    await store.insertChunk({
      id: genId('chk'), documentId: docId, content: chunks[i],
      embedding, chunkIndex: i, createdAt: new Date().toISOString(),
    });
  }
  return chunks.length;
}

export function createIndexer(
  store: DocumentStore,
  embeddingClient: EmbeddingClient,
): Indexer {
  return {
    async indexDocument(tenantId, title, content, category, requestId) {
      log.info('indexer: indexDocument', requestId, { tenantId, title, category });

      const doc: Document = {
        id: genId('doc'), tenantId, title, content, category,
        metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await store.insertDocument(doc);
      const chunksCount = await embedAndStoreChunks(doc.id, content, store, embeddingClient, requestId);

      log.info('indexer: document indexed', requestId, { docId: doc.id, chunksCount });
      return doc;
    },

    async reindexAll(tenantId, requestId) {
      log.info('indexer: reindexAll', requestId, { tenantId });
      const docs = await store.getDocumentsByTenant(tenantId);
      let totalChunks = 0;

      for (const doc of docs) {
        await store.deleteChunksByDocumentId(doc.id);
        totalChunks += await embedAndStoreChunks(doc.id, doc.content, store, embeddingClient, requestId);
      }

      log.info('indexer: reindex complete', requestId, { tenantId, docsCount: docs.length, totalChunks });
      return { indexed: totalChunks };
    },
  };
}
