# Sprint 3: Context Processor

## Objective
Build the sanitization pipeline, relevance ranking, and context trimming that processes the SCS before sending to LLM.

## Tasks

### 1. Sanitizer (server/src/modules/context/sanitizer.ts)
Pipeline functions (per PRD Section 9.2):

- `redactSecrets(snapshot)` → snapshot
  - Regex patterns: API keys, JWT tokens, connection strings, pre-signed URLs
  - Allowlist of safe fields (from PRD 9.3)
  - Log INFO: fields redacted count

- `maskPII(snapshot)` → snapshot
  - Email: `e***@d***.com` (stable mask based on hash)
  - Phone: `+1***567`
  - Log INFO: PII fields masked count

- `removeBinary(snapshot)` → snapshot
  - Strip any base64 payloads, file contents
  - Keep only metadata (size, type, name)

- `stripInternalUrls(snapshot)` → snapshot
  - Remove internal endpoints, IPs, hostnames
  - Keep only public-facing routes

- `validateSchema(snapshot)` → snapshot
  - Verify SCS conforms to type definition
  - Throw ValidationError if malformed

- `sanitize(snapshot)` → { sanitized: snapshot, audit: SanitizationAudit }
  - Runs full pipeline in order
  - Returns sanitized snapshot + audit record
  - Log INFO: full audit summary (fields removed, PII masked, bytes removed)

### 2. Ranker (server/src/modules/context/ranker.ts)
- `rankByRelevance(snapshot)` → RankedSnapshot
  - Priority 1 (never removed): identity, productState (active errors)
  - Priority 2: recentActivity, backend (recent requests, jobs, errors)
  - Priority 3: knowledgePack (docs, runbooks)
  - Priority 4 (first to cut): attachments
  - Within each priority: sort by recency (newest first)
  - Log DEBUG: ranking applied with counts per priority

### 3. Trimmer (server/src/modules/context/trimmer.ts)
- `trimToSize(snapshot, maxBytes)` → { trimmed: snapshot, truncation: TruncationInfo }
  - Calculate current size (JSON.stringify byte length)
  - If under maxBytes, return as-is
  - Cut from priority 4 → 3 → 2, never cut priority 1
  - Within a priority: remove oldest items first
  - Semantic compression: for long text fields, keep first 200 chars + "..."
  - Record what was removed in truncation counters
  - Log INFO: trimmed from X bytes to Y bytes, items removed per category

### 4. Context Pipeline (server/src/modules/context/context.service.ts)
- `processContext(snapshot, maxBytes)` → { processed: SCS, audit: ContextAudit }
  - Step 1: sanitize(snapshot)
  - Step 2: rankByRelevance(sanitized)
  - Step 3: trimToSize(ranked, maxBytes)
  - Returns processed snapshot + full audit trail
  - Log INFO: pipeline complete with input bytes, output bytes, truncation summary

## Tests
1. redactSecrets removes JWT tokens from data
2. redactSecrets removes connection strings
3. redactSecrets preserves allowed fields (IDs, timestamps, error codes)
4. maskPII masks email addresses consistently
5. maskPII preserves non-PII fields
6. removeBinary strips base64 content
7. stripInternalUrls removes internal endpoints
8. validateSchema rejects malformed snapshot
9. rankByRelevance puts active errors in priority 1
10. trimToSize reduces snapshot to under maxBytes
11. trimToSize removes attachments first (priority 4)
12. trimToSize records truncation counters accurately
13. Full pipeline: sanitize → rank → trim produces valid output
14. Sanitization audit records all changes

## Definition of Done
- `npx vitest run` — all 14 tests pass
- Secrets are NEVER in output (verified by test)
- PII is masked (verified by test)
- Context fits within maxBytes (verified by test)
- Audit trail complete
