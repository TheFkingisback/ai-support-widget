# Sprint 6: Escalation Engine

## Objective
Build the system that creates tickets in external systems (Zendesk/Jira) when AI can't resolve.

## Tasks

### 1. Schema (server/src/modules/escalation/escalation.schema.ts)
Table:
- `tickets`: id, tenantId, caseId, externalId, externalUrl, connector, status, createdAt

### 2. Ticket Builder (server/src/modules/escalation/ticket-builder.ts)
- `buildTicket(case, messages, snapshot)` → TicketPayload
  - Summary: AI-generated conversation summary (call LLM with short prompt)
  - Description: structured with sections:
    - User reported: [first message]
    - AI diagnosis: [last assistant message]
    - Evidence: [extracted evidence from messages]
    - Click timeline: [from snapshot]
    - System state: [sanitized snapshot summary]
  - Tags: error codes from snapshot
  - Priority: based on error class (infra = high, validation = low)
  - Log INFO: ticket built for caseId

### 3. Connector Interface (server/src/modules/escalation/connectors/connector.ts)
- Abstract interface:
  - `createTicket(payload: TicketPayload)` → { externalId, externalUrl }

### 4. Zendesk Connector (server/src/modules/escalation/connectors/zendesk.ts)
- Implements connector interface
- POST to Zendesk API to create ticket
- Maps priority, tags, description
- Log INFO: Zendesk ticket created with externalId

### 5. Jira Connector (server/src/modules/escalation/connectors/jira.ts)
- Same pattern as Zendesk
- Creates Jira issue via REST API

### 6. Email Connector (server/src/modules/escalation/connectors/email.ts)
- Fallback: sends ticket content via email (SMTP or SendGrid)
- For tenants without Zendesk/Jira configured

### 7. Escalation Service (server/src/modules/escalation/escalation.service.ts)
- `escalate(caseId, tenantId, reason)` → { ticketId, ticketUrl }
  - Load case + messages + snapshot
  - Build ticket payload
  - Select connector based on tenant config
  - Create ticket via connector
  - Store ticket record in DB
  - Update case status to 'escalated'
  - Log INFO: case escalated, connector used, externalId

## Tests
1. buildTicket includes conversation summary
2. buildTicket includes evidence from messages
3. buildTicket includes click timeline from snapshot
4. Zendesk connector sends correct API call
5. Jira connector sends correct API call
6. Email connector sends email with ticket content
7. escalate selects correct connector for tenant
8. escalate updates case status to 'escalated'
9. escalate stores ticket record in DB

## Definition of Done
- `npx vitest run` — all 9 tests pass
- Escalation creates tickets with full context
- Connectors are mocked but interface is correct
- Case status updated on escalation
