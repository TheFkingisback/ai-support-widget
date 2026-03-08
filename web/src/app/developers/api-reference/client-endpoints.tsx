import { EndpointCard } from '../components/endpoint-card';

export function ClientEndpoints() {
  return (
    <div className="space-y-4">
      <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
        <strong className="text-yellow-400">Important:</strong> These endpoints are called
        server-to-server by the Support Gateway using the service token you provided
        during tenant setup. They must return JSON.
      </div>

      <EndpointCard
        method="GET"
        path="/support/user-state"
        description="Returns the current state of a user: roles, plan, enabled features, active resources, errors, and limits. This is the primary context source for AI diagnosis."
        auth="Service Token"
        params={[
          { name: 'userId', type: 'string', required: true, desc: 'User ID to look up' },
        ]}
        response={`{
  "userId": "usr_123",
  "tenantId": "ten_abc",
  "roles": ["user", "admin"],
  "plan": "pro",
  "featuresEnabled": ["uploads", "exports"],
  "entities": [
    {
      "type": "project",
      "id": "prj_1",
      "status": "active",
      "description": "Main project",
      "metadata": {}
    }
  ],
  "activeErrors": [
    {
      "errorCode": "UPLOAD_TOO_LARGE",
      "errorClass": "validation",
      "retryable": false,
      "userActionable": true,
      "resourceId": "file_99",
      "occurredAt": "2026-02-20T10:00:00.000Z"
    }
  ],
  "limitsReached": [
    { "limit": "storage", "current": 95, "max": 100 }
  ]
}`}
      />

      <EndpointCard
        method="GET"
        path="/support/user-history"
        description="Returns recent user activity events and click timeline within the specified time window. Used to understand what the user was doing before contacting support."
        auth="Service Token"
        params={[
          { name: 'userId', type: 'string', required: true, desc: 'User ID' },
          { name: 'windowHours', type: 'number', required: false, desc: 'Lookback window (default: 72)' },
        ]}
        response={`{
  "windowHours": 72,
  "events": [
    {
      "ts": "2026-02-20T09:00:00.000Z",
      "event": "file.upload",
      "page": "/projects/1/files",
      "elementId": "upload-btn",
      "intent": "upload_file",
      "correlationRequestId": "req_abc123"
    }
  ],
  "clickTimeline": [
    {
      "ts": "2026-02-20T09:00:00.000Z",
      "page": "/projects",
      "action": "click"
    }
  ]
}`}
      />

      <EndpointCard
        method="GET"
        path="/support/user-logs"
        description="Returns backend request logs, background job states, and errors for the user. Provides the 'server side' of the story to correlate with user-visible errors."
        auth="Service Token"
        params={[
          { name: 'userId', type: 'string', required: true, desc: 'User ID' },
          { name: 'windowHours', type: 'number', required: false, desc: 'Lookback window (default: 72)' },
        ]}
        response={`{
  "recentRequests": [
    {
      "ts": "2026-02-20T09:01:00.000Z",
      "route": "POST /api/files",
      "httpStatus": 413,
      "errorCode": "UPLOAD_TOO_LARGE",
      "resourceId": "file_99",
      "timingMs": 45,
      "requestId": "req_abc123"
    }
  ],
  "jobs": [
    {
      "jobId": "job_001",
      "queue": "file-processing",
      "status": "failed",
      "errorCode": "PROCESSING_TIMEOUT",
      "lastStage": "thumbnail",
      "createdAt": "2026-02-20T08:00:00.000Z",
      "updatedAt": "2026-02-20T08:05:00.000Z",
      "durationMs": 300000
    }
  ],
  "errors": [
    {
      "ts": "2026-02-20T09:01:00.000Z",
      "errorCode": "UPLOAD_TOO_LARGE",
      "errorClass": "validation",
      "route": "POST /api/files",
      "requestId": "req_abc123",
      "resourceId": "file_99"
    }
  ]
}`}
      />

      <EndpointCard
        method="GET"
        path="/support/business-rules"
        description="Returns your application's business rules and error catalog. Provides the AI with domain knowledge about what limits, rules, and error resolutions exist."
        auth="Service Token"
        response={`{
  "rules": {
    "maxUploadSizeMb": 100,
    "allowedFileTypes": ["jpg", "png", "pdf"],
    "maxProjectsPerUser": 10
  },
  "errorCatalog": [
    {
      "errorCode": "UPLOAD_TOO_LARGE",
      "errorClass": "validation",
      "retryable": false,
      "userActionable": true,
      "resolution": "Reduce file size below the plan limit."
    }
  ]
}`}
      />
    </div>
  );
}
