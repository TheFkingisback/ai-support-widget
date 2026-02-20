# Sprint 5: Knowledge Base (RAG)

## Objective
Build the knowledge base with document indexing, embeddings, and retrieval for the AI to reference.

## Tasks

### 1. Schema (server/src/modules/knowledge/knowledge.schema.ts)
Tables:
- `documents`: id, tenantId, title, content, category (doc/runbook/changelog/faq), metadata (jsonb), createdAt, updatedAt
- `document_chunks`: id, documentId, content, embedding (vector(1536)), chunkIndex, createdAt

### 2. Embeddings Client (server/src/modules/knowledge/embeddings.ts)
- `generateEmbedding(text: string)` → number[] (1536 dimensions)
  - Call OpenAI text-embedding-3-small via OpenRouter or directly
  - Log INFO: text length, latency
  - Cache frequently used embeddings (in-memory LRU)

### 3. Indexer (server/src/modules/knowledge/indexer.ts)
- `indexDocument(tenantId, title, content, category)` → Document
  - Chunk content into ~500 token pieces with 50 token overlap
  - Generate embedding for each chunk
  - Store document + chunks in DB
  - Log INFO: document indexed, chunks count

- `reindexAll(tenantId)` → { indexed: number }
  - Delete existing chunks, re-chunk and re-embed
  - Log INFO: reindex complete, total chunks

### 4. Retriever (server/src/modules/knowledge/retriever.ts)
- `search(tenantId, query, limit)` → KnowledgeDoc[]
  - Generate embedding for query
  - Vector similarity search via pgvector (cosine distance)
  - Filter by tenantId (tenant isolation!)
  - Return top N documents
  - Log INFO: query, results count, top similarity score

### 5. Knowledge Service (server/src/modules/knowledge/knowledge.service.ts)
- `getRelevantDocs(tenantId, userMessage, snapshot)` → KnowledgeDoc[]
  - Combine user message + active error codes as search query
  - Search knowledge base
  - Filter by category preference: runbooks > docs > changelog > faq
  - Limit to MAX_DOCS (from tenant config)
  - Log INFO: docs retrieved count

### 6. Wire to Orchestrator
- Before calling LLM, fetch relevant docs
- Include in knowledgePack section of system prompt

## Tests
1. generateEmbedding returns 1536-dimension vector
2. indexDocument chunks content correctly
3. indexDocument stores chunks with embeddings
4. search returns relevant documents by similarity
5. search filters by tenantId (tenant isolation)
6. search returns empty for unrelated query
7. getRelevantDocs combines user message with error codes
8. getRelevantDocs respects MAX_DOCS limit
9. Reindex deletes old chunks and creates new ones

## Definition of Done
- `npx vitest run` — all 9 tests pass
- Documents can be indexed with embeddings
- Vector search returns relevant results
- Tenant isolation on search
- Integrated with orchestrator
