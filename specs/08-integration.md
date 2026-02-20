# Sprint 8: Integration Test

## Objective
Verify the complete flow works end-to-end: case creation → snapshot → sanitization → LLM → response with evidence.

## Tasks

### 1. Mock Client APIs (server/src/tests/mocks/client-apis.ts)
Create mock implementations of the 4 client API endpoints that return realistic test data:
- getUserState: user with active upload error
- getUserHistory: click timeline showing upload attempt
- getUserLogs: failed API request + failed job
- getBusinessRules: upload size limit, rate limits

### 2. Mock OpenRouter (server/src/tests/mocks/openrouter.ts)
Create mock that returns structured response with:
- Diagnosis referencing the upload error
- Evidence citing job ID and error code
- Suggested action: retry upload

### 3. Full Flow Integration Test (server/src/tests/integration/full-flow.test.ts)
Test the complete pipeline:
1. Create tenant
2. Create case with message "my upload failed"
3. Verify snapshot was generated
4. Verify snapshot was sanitized (no secrets)
5. Verify LLM was called with correct system prompt
6. Verify AI response contains evidence and actions
7. Send follow-up message
8. Verify conversation memory includes previous messages
9. Add feedback (positive)
10. Verify case status reflects feedback

### 4. Tenant Isolation Integration Test (server/src/tests/integration/isolation.test.ts)
1. Create two tenants (A and B)
2. Create case for tenant A
3. Try to access case as tenant B → verify 404/403
4. Try to access snapshot as tenant B → verify blocked
5. Search knowledge base as tenant B → verify empty (no cross-tenant docs)

### 5. Sanitization Integration Test (server/src/tests/integration/sanitization.test.ts)
1. Create snapshot with secrets in data (API keys, tokens, connection strings)
2. Process through context pipeline
3. Verify ZERO secrets in output
4. Verify PII is masked
5. Verify audit trail records all removals

### 6. Context Trimming Integration Test (server/src/tests/integration/trimming.test.ts)
1. Create snapshot with 10MB of data
2. Set MAX_CONTEXT_BYTES to 1MB
3. Process through context pipeline
4. Verify output is under 1MB
5. Verify priority 1 data preserved (identity, active errors)
6. Verify truncation counters are accurate

## Tests
1. Full flow: case → snapshot → sanitize → LLM → response with evidence
2. Follow-up message includes conversation history
3. Feedback updates case
4. Tenant A cannot access tenant B's case
5. Tenant A cannot access tenant B's snapshot
6. Tenant A cannot see tenant B's knowledge docs
7. Secrets are removed from LLM input
8. PII is masked in LLM input
9. Audit records all sanitization actions
10. 10MB snapshot trimmed to under 1MB
11. Identity block preserved after trimming
12. Truncation counters match actual removals

## Definition of Done
- `npx vitest run` — all 12 tests pass
- Full pipeline works end-to-end
- Tenant isolation verified across all modules
- Sanitization verified with actual secret patterns
- Context trimming verified with oversized data
