import { EndpointCard } from '../components/endpoint-card';

export function GatewayEndpoints() {
  return (
    <div className="space-y-4">
      <EndpointCard
        method="GET"
        path="/api/health"
        description="Health check endpoint. Returns the gateway status and version."
        auth="None"
        response={`{
  "ok": true,
  "version": "1.0.0"
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/cases"
        description="Create a new support case. The gateway generates a Support Context Snapshot, calls your 4 endpoints, and sends the first AI response."
        auth="Bearer JWT"
        params={[
          { name: 'message', type: 'string', required: true, desc: 'Initial user message' },
          { name: 'context', type: 'object', required: false, desc: 'Optional context metadata' },
        ]}
        body={`{
  "message": "I can't upload files larger than 50MB",
  "context": { "page": "/projects/1/files" }
}`}
        response={`{
  "case": {
    "id": "cas_abc123",
    "tenantId": "ten_xxx",
    "userId": "usr_123",
    "status": "active",
    "snapshotId": "scs_xyz789",
    "createdAt": "2026-02-20T10:00:00.000Z",
    "messageCount": 2
  },
  "snapshot": { "id": "scs_xyz789" }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/cases/:caseId"
        description="Retrieve a support case with all its messages, including evidence and suggested actions."
        auth="Bearer JWT"
        params={[
          { name: 'caseId', type: 'string', required: true, desc: 'Case ID (cas_xxx)' },
        ]}
        response={`{
  "case": {
    "id": "cas_abc123",
    "status": "active",
    "messageCount": 4
  },
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "I can't upload files larger than 50MB",
      "createdAt": "2026-02-20T10:00:00.000Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "I can see your account is on the Pro plan...",
      "evidence": [
        { "type": "error_code", "label": "Error", "value": "UPLOAD_TOO_LARGE" }
      ],
      "confidence": 0.95,
      "createdAt": "2026-02-20T10:00:02.000Z"
    }
  ]
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/cases/:caseId/messages"
        description="Send a follow-up message to an active case. Returns the AI response with evidence."
        auth="Bearer JWT"
        params={[
          { name: 'caseId', type: 'string', required: true, desc: 'Case ID' },
        ]}
        body={`{ "content": "How do I increase my upload limit?" }`}
        response={`{
  "message": {
    "id": "msg_003",
    "role": "assistant",
    "content": "Your current plan (Pro) has a 100MB upload limit...",
    "actions": [
      { "type": "open_docs", "label": "View plan limits", "payload": {} }
    ],
    "evidence": [
      { "type": "resource_id", "label": "Plan", "value": "pro" }
    ],
    "confidence": 0.92,
    "createdAt": "2026-02-20T10:01:00.000Z"
  }
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/cases/:caseId/feedback"
        description="Submit user feedback (thumbs up/down) for a case."
        auth="Bearer JWT"
        body={`{ "feedback": "positive" }`}
        response={`{ "ok": true }`}
      />

      <EndpointCard
        method="POST"
        path="/api/cases/:caseId/close"
        description="Close a support case with resolution status and optional rating."
        auth="Bearer JWT"
        body={`{
  "resolution": "resolved",
  "rating": 9
}`}
        response={`{ "ok": true }`}
      />

      <EndpointCard
        method="POST"
        path="/api/cases/:caseId/escalate"
        description="Escalate a case to your ticketing system (Zendesk, Jira, etc.). Creates a ticket with full context."
        auth="Bearer JWT"
        body={`{ "reason": "Need manual account adjustment" }`}
        response={`{
  "ticketId": "TICKET-1234",
  "ticketUrl": "https://yourcompany.zendesk.com/tickets/1234"
}`}
      />
    </div>
  );
}
