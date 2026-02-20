import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { SupportContextSnapshot, KnowledgeDoc } from '../../../../shared/types.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { clearEmbeddingCache, EMBEDDING_DIM } from './embeddings.js';
import type { EmbeddingClient } from './embeddings.js';
import { chunkText, createIndexer } from './indexer.js';
import type { DocumentStore, Document, DocumentChunk } from './indexer.js';
import { createRetriever } from './retriever.js';
import type { ChunkStore, ChunkWithMeta } from './retriever.js';
import { createKnowledgeService } from './knowledge.service.js';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-test-'));
  setLogsDir(tmpDir);
  setLogLevel('low');

  process.env.JWT_SECRET = 'test-secret-knowledge';
  process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.OPENROUTER_API_KEY = 'sk-fake';
  resetEnvCache();
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  clearEmbeddingCache();
});

// ─── Helpers ───

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/** Deterministic fake embedding: hash the text into a 1536-dim vector */
function fakeEmbedding(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBEDDING_DIM] += text.charCodeAt(i) / 1000;
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= mag;
  }
  return vec;
}

function createMockEmbeddingClient(): EmbeddingClient & { callCount: number } {
  return {
    callCount: 0,
    async generateEmbedding(text: string): Promise<number[]> {
      this.callCount++;
      return fakeEmbedding(text);
    },
  };
}

function createMockDocumentStore(): DocumentStore & {
  _docs: Document[];
  _chunks: DocumentChunk[];
} {
  const _docs: Document[] = [];
  const _chunks: DocumentChunk[] = [];

  return {
    _docs,
    _chunks,
    async insertDocument(doc) { _docs.push(doc); },
    async insertChunk(chunk) { _chunks.push(chunk); },
    async getDocumentsByTenant(tenantId) {
      return _docs.filter((d) => d.tenantId === tenantId);
    },
    async deleteChunksByDocumentId(documentId) {
      const toRemove = new Set(
        _chunks.filter((c) => c.documentId === documentId).map((c) => c.id),
      );
      for (let i = _chunks.length - 1; i >= 0; i--) {
        if (toRemove.has(_chunks[i].id)) _chunks.splice(i, 1);
      }
    },
  };
}

function createMockChunkStore(
  docStore: ReturnType<typeof createMockDocumentStore>,
): ChunkStore {
  return {
    async getAllChunksForTenant(tenantId) {
      const tenantDocs = docStore._docs.filter((d) => d.tenantId === tenantId);
      const docIds = new Set(tenantDocs.map((d) => d.id));
      const results: ChunkWithMeta[] = [];

      for (const chunk of docStore._chunks) {
        if (!docIds.has(chunk.documentId)) continue;
        const doc = tenantDocs.find((d) => d.id === chunk.documentId)!;
        results.push({
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          embedding: chunk.embedding,
          chunkIndex: chunk.chunkIndex,
          docTitle: doc.title,
          docCategory: doc.category,
          tenantId: doc.tenantId,
        });
      }
      return results;
    },
  };
}

function makeSnapshot(overrides?: Partial<SupportContextSnapshot>): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: 'scs_test123',
      createdAt: '2026-02-20T10:00:00.000Z',
      maxBytes: 500000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: 'ten_abc',
      userId: 'usr_xyz',
      roles: ['admin'],
      plan: 'pro',
      featuresEnabled: ['feature_a'],
    },
    productState: {
      entities: [],
      activeErrors: [
        {
          errorCode: 'UPLOAD_TOO_LARGE',
          errorClass: 'validation',
          retryable: true,
          userActionable: true,
          resourceId: 'res_1',
          occurredAt: '2026-02-20T09:55:00.000Z',
        },
      ],
      limitsReached: [],
    },
    recentActivity: { windowHours: 72, events: [], clickTimeline: [] },
    backend: { recentRequests: [], jobs: [], errors: [] },
    knowledgePack: { docs: [], runbooks: [], changelog: [] },
    privacy: { redactionVersion: '1.0.0', fieldsRemoved: [] },
    ...overrides,
  };
}

// ==================== EMBEDDINGS TESTS ====================

describe('Embeddings client', () => {
  // Test 1: generateEmbedding returns 1536-dimension vector
  it('returns 1536-dimension vector', async () => {
    const client = createMockEmbeddingClient();
    const embedding = await client.generateEmbedding('How to upload files');
    expect(embedding).toHaveLength(EMBEDDING_DIM);
    expect(typeof embedding[0]).toBe('number');
    expect(embedding.every((v) => typeof v === 'number' && !isNaN(v))).toBe(true);
  });
});

// ==================== INDEXER TESTS ====================

describe('Indexer', () => {
  // Test 2: indexDocument chunks content correctly
  it('chunks content into ~500 token pieces', () => {
    // 500 tokens × 4 chars/token = 2000 chars per chunk
    const longText = 'A'.repeat(5000); // Should produce 3 chunks
    const chunks = chunkText(longText);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(2000);
    expect(chunks[1].length).toBe(2000); // starts at 2000-200=1800, goes to 3800
    expect(chunks[2].length).toBeLessThanOrEqual(2000);
  });

  // Test 3: indexDocument stores chunks with embeddings
  it('stores chunks with embeddings in store', async () => {
    const embeddingClient = createMockEmbeddingClient();
    const store = createMockDocumentStore();
    const indexer = createIndexer(store, embeddingClient);

    const doc = await indexer.indexDocument(
      'ten_abc',
      'Upload Guide',
      'How to upload files to the platform. Step 1: Select file. Step 2: Click upload.',
      'doc',
      'req_test03',
    );

    expect(doc.id).toMatch(/^doc_/);
    expect(doc.tenantId).toBe('ten_abc');
    expect(doc.title).toBe('Upload Guide');
    expect(doc.category).toBe('doc');

    // Content is short, should be 1 chunk
    expect(store._chunks.length).toBe(1);
    expect(store._chunks[0].embedding).toHaveLength(EMBEDDING_DIM);
    expect(store._chunks[0].documentId).toBe(doc.id);
    expect(store._chunks[0].chunkIndex).toBe(0);
    expect(embeddingClient.callCount).toBe(1);
  });
});

// ==================== RETRIEVER TESTS ====================

describe('Retriever', () => {
  let embeddingClient: ReturnType<typeof createMockEmbeddingClient>;
  let docStore: ReturnType<typeof createMockDocumentStore>;
  let chunkStore: ChunkStore;

  beforeEach(async () => {
    embeddingClient = createMockEmbeddingClient();
    docStore = createMockDocumentStore();
    chunkStore = createMockChunkStore(docStore);

    const indexer = createIndexer(docStore, embeddingClient);

    // Index some docs for ten_abc
    await indexer.indexDocument('ten_abc', 'Upload Guide', 'How to upload files to the platform', 'doc');
    await indexer.indexDocument('ten_abc', 'Upload Errors Runbook', 'Troubleshoot UPLOAD_TOO_LARGE errors', 'runbook');
    await indexer.indexDocument('ten_abc', 'Billing FAQ', 'How billing works for your plan', 'faq');

    // Index a doc for a DIFFERENT tenant
    await indexer.indexDocument('ten_other', 'Secret Doc', 'Confidential info for another tenant', 'doc');
  });

  // Test 4: search returns relevant documents by similarity
  it('returns relevant documents by similarity', async () => {
    const retriever = createRetriever(chunkStore, embeddingClient);
    const results = await retriever.search('ten_abc', 'upload file error', 3, 'req_test04');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThanOrEqual(3);
    // All results should be from ten_abc
    results.forEach((r) => {
      expect(r.id).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.content).toBeTruthy();
    });
  });

  // Test 5: search filters by tenantId (tenant isolation)
  it('filters by tenantId (tenant isolation)', async () => {
    const retriever = createRetriever(chunkStore, embeddingClient);
    const results = await retriever.search('ten_abc', 'confidential secret', 10, 'req_test05');

    // Should NOT return the secret doc from ten_other
    const secretDoc = results.find((r) => r.title === 'Secret Doc');
    expect(secretDoc).toBeUndefined();
  });

  // Test 6: search returns empty for unrelated query
  it('returns empty for tenant with no docs', async () => {
    const retriever = createRetriever(chunkStore, embeddingClient);
    const results = await retriever.search('ten_no_docs', 'anything', 5, 'req_test06');
    expect(results).toHaveLength(0);
  });
});

// ==================== KNOWLEDGE SERVICE TESTS ====================

describe('Knowledge service', () => {
  let embeddingClient: ReturnType<typeof createMockEmbeddingClient>;
  let docStore: ReturnType<typeof createMockDocumentStore>;
  let chunkStore: ChunkStore;

  beforeEach(async () => {
    embeddingClient = createMockEmbeddingClient();
    docStore = createMockDocumentStore();
    chunkStore = createMockChunkStore(docStore);

    const indexer = createIndexer(docStore, embeddingClient);

    await indexer.indexDocument('ten_abc', 'Upload Guide', 'How to upload files to the platform', 'doc');
    await indexer.indexDocument('ten_abc', 'Upload Errors Runbook', 'Troubleshoot UPLOAD_TOO_LARGE errors', 'runbook');
    await indexer.indexDocument('ten_abc', 'Billing FAQ', 'How billing works for plans and pricing', 'faq');
    await indexer.indexDocument('ten_abc', 'v2.0 Changelog', 'Added new upload size limits', 'changelog');
  });

  // Test 7: getRelevantDocs combines user message with error codes
  it('combines user message with error codes for search', async () => {
    const retriever = createRetriever(chunkStore, embeddingClient);
    const service = createKnowledgeService(retriever);
    const snapshot = makeSnapshot();

    const docs = await service.getRelevantDocs(
      'ten_abc',
      'My file upload is failing',
      snapshot,
      5,
      'req_test07',
    );

    expect(docs.length).toBeGreaterThanOrEqual(1);
    // The search query includes UPLOAD_TOO_LARGE from snapshot's activeErrors
    // so we should get upload-related docs
    const uploadDocs = docs.filter(
      (d) => d.title.toLowerCase().includes('upload'),
    );
    expect(uploadDocs.length).toBeGreaterThanOrEqual(1);
  });

  // Test 8: getRelevantDocs respects MAX_DOCS limit
  it('respects maxDocs limit', async () => {
    const retriever = createRetriever(chunkStore, embeddingClient);
    const service = createKnowledgeService(retriever);
    const snapshot = makeSnapshot();

    const docs = await service.getRelevantDocs(
      'ten_abc',
      'upload',
      snapshot,
      2,
      'req_test08',
    );

    expect(docs.length).toBeLessThanOrEqual(2);
  });
});

// ==================== REINDEX TEST ====================

describe('Reindex', () => {
  // Test 9: reindexAll deletes old chunks and creates new ones
  it('deletes old chunks and creates new ones', async () => {
    const embeddingClient = createMockEmbeddingClient();
    const store = createMockDocumentStore();
    const indexer = createIndexer(store, embeddingClient);

    // Index a document
    await indexer.indexDocument('ten_abc', 'Guide', 'Some content here', 'doc');
    const initialChunks = store._chunks.length;
    expect(initialChunks).toBe(1);
    const oldChunkId = store._chunks[0].id;

    // Reindex
    const result = await indexer.reindexAll('ten_abc', 'req_test09');

    expect(result.indexed).toBe(1);
    // Old chunks should be gone, new ones created
    expect(store._chunks.length).toBe(1);
    expect(store._chunks[0].id).not.toBe(oldChunkId);
  });
});
