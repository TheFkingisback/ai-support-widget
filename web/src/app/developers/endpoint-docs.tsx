const endpoints = [
  {
    method: 'GET',
    path: '/support/user-state',
    params: 'userId',
    desc: 'Returns current user state, active errors, and limits.',
    response: `{
  "userId": "usr_123",
  "tenantId": "ten_abc",
  "roles": ["user", "admin"],
  "plan": "pro",
  "featuresEnabled": ["uploads", "exports"],
  "entities": [
    { "type": "project", "id": "prj_1", "status": "active", "metadata": {} }
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
}`,
  },
  {
    method: 'GET',
    path: '/support/user-history',
    params: 'userId, windowHours',
    desc: 'Returns recent user activity and click timeline.',
    response: `{
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
    { "ts": "2026-02-20T09:00:00.000Z", "page": "/projects", "action": "click" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/support/user-logs',
    params: 'userId, windowHours',
    desc: 'Returns backend request logs, job states, and errors.',
    response: `{
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
}`,
  },
  {
    method: 'GET',
    path: '/support/business-rules',
    params: 'none',
    desc: 'Returns business rules and error catalog for your tenant.',
    response: `{
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
}`,
  },
];

export function EndpointDocs() {
  return (
    <section data-testid="endpoint-docs">
      <h2 className="mb-6 text-3xl font-bold">4 Required Endpoints</h2>
      <p className="mb-6 text-gray-400">
        Your host application must implement these 4 endpoints. The AI Support
        Widget backend calls them to build the Support Context Snapshot.
      </p>
      <div className="space-y-8">
        {endpoints.map((ep) => (
          <div key={ep.path} className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded bg-green-700 px-2 py-0.5 text-xs font-bold">{ep.method}</span>
              <code className="text-blue-400">{ep.path}</code>
            </div>
            <p className="mb-1 text-sm text-gray-400">Query params: {ep.params}</p>
            <p className="mb-3 text-gray-300">{ep.desc}</p>
            <details>
              <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                Example response
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-950 p-3 text-xs text-gray-300">
                {ep.response}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
