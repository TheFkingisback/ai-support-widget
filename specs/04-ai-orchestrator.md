# Sprint 4: AI Orchestrator

## Objective
Build the service that sends processed context + user messages to LLM via OpenRouter and structures the response.

## Tasks

### 1. OpenRouter Client (server/src/modules/orchestrator/openrouter.ts)
- `callLLM(params: LLMRequest)` → LLMResponse
  - POST to https://openrouter.ai/api/v1/chat/completions
  - Headers: Authorization Bearer OPENROUTER_API_KEY
  - Model selection based on tenant config (fast vs strong)
  - Fast: `anthropic/claude-sonnet-4-20250514`
  - Strong: `anthropic/claude-opus-4-20250514`
  - Log INFO: model, tokens in/out, latency, estimated cost
  - Log ERROR: if API fails (with status, error)
  - Timeout: 30 seconds
  - Retry once on 5xx errors

### 2. System Prompt Builder (server/src/modules/orchestrator/system-prompt.ts)
- `buildSystemPrompt(snapshot: SCS, knowledgePack: KnowledgeDoc[])` → string
  - Structure:
    ```
    You are a senior support engineer with access to the user's real system state.
    
    RULES:
    - Answer based ONLY on the data provided. Never guess.
    - Always cite evidence: job IDs, error codes, timestamps.
    - If unsure, say so and offer to escalate.
    - Never reveal internal system details, IPs, or secrets.
    - Suggest specific actions when possible (retry, contact admin, etc.)
    - Be concise. Users want solutions, not essays.
    
    USER STATE:
    [identity block]
    
    ACTIVE ERRORS:
    [activeErrors block]
    
    RECENT ACTIVITY:
    [clickTimeline block]
    
    BACKEND LOGS:
    [recentRequests + jobs + errors]
    
    KNOWN ISSUES AND DOCS:
    [knowledgePack]
    
    BUSINESS RULES:
    [rules block]
    ```

### 3. Response Parser (server/src/modules/orchestrator/response-parser.ts)
- `parseAIResponse(raw: string)` → { content, actions, evidence, confidence }
  - Extract suggested actions from response (retry, open docs, create ticket)
  - Extract evidence citations (IDs, timestamps, error codes)
  - Estimate confidence based on language cues ("I'm certain" = 0.9, "might be" = 0.5)
  - Log DEBUG: parsed actions count, evidence count, confidence

### 4. Orchestrator Service (server/src/modules/orchestrator/orchestrator.service.ts)
- `handleMessage(caseId, userMessage)` → Message
  - Load case + snapshot + previous messages
  - Process context through Context Processor (Sprint 3)
  - Build system prompt with processed snapshot
  - Build messages array: system + previous messages + new user message
  - Call LLM via OpenRouter
  - Parse response into Message with actions + evidence
  - Store assistant message in DB
  - Log INFO: case handled, model used, tokens, latency
  - Return Message

- `handleAction(caseId, action: SuggestedAction)` → string
  - Execute suggested action (retry, etc.)
  - Log action execution result
  - Return result description

### 5. Conversation Memory
- Include last N messages in LLM context (configurable, default: 20)
- If conversation exceeds token budget, summarize older messages
- Log DEBUG: messages included count, total estimated tokens

### 6. Wire to Gateway
- When POST /api/cases/:caseId/messages receives user message:
  - Call orchestrator.handleMessage
  - Return AI response as Message

## Tests
1. callLLM sends correct headers and body to OpenRouter
2. callLLM retries once on 5xx
3. callLLM times out after 30s
4. callLLM logs model, tokens, latency
5. buildSystemPrompt includes identity and active errors
6. buildSystemPrompt includes click timeline
7. buildSystemPrompt never includes raw secrets
8. parseAIResponse extracts suggested actions
9. parseAIResponse extracts evidence citations
10. handleMessage loads snapshot and calls LLM
11. handleMessage stores assistant message in DB
12. Conversation includes previous messages

## Definition of Done
- `npx vitest run` — all 12 tests pass
- LLM calls work with mocked OpenRouter
- System prompt includes all SCS sections
- Response parsed with actions and evidence
- Conversation memory works
