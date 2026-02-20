import http from 'node:http';
import type {
  GetUserStateResponse,
  GetUserHistoryResponse,
  GetUserLogsResponse,
  GetBusinessRulesResponse,
} from '../../../../shared/types.js';

const NOW = '2026-02-20T10:00:00.000Z';
const HOUR_AGO = '2026-02-20T09:00:00.000Z';
const TWO_HOURS_AGO = '2026-02-20T08:00:00.000Z';

export function mockUserState(userId: string, tenantId: string): GetUserStateResponse {
  return {
    userId,
    tenantId,
    roles: ['user', 'editor'],
    plan: 'pro',
    featuresEnabled: ['uploads', 'api_access'],
    entities: [
      { type: 'project', id: 'proj_abc123', status: 'active', metadata: { name: 'My Project' } },
      { type: 'upload', id: 'upload_xyz789', status: 'failed', metadata: { fileName: 'report.pdf', sizeBytes: 52_428_800 } },
    ],
    activeErrors: [
      {
        errorCode: 'UPLOAD_TOO_LARGE',
        errorClass: 'validation',
        retryable: true,
        userActionable: true,
        resourceId: 'upload_xyz789',
        occurredAt: HOUR_AGO,
      },
    ],
    limitsReached: [
      { limit: 'upload_size_mb', current: 50, max: 25 },
    ],
  };
}

export function mockUserHistory(): GetUserHistoryResponse {
  return {
    windowHours: 72,
    events: [
      { ts: TWO_HOURS_AGO, event: 'page_view', page: '/dashboard', elementId: null, intent: null, correlationRequestId: null },
      { ts: HOUR_AGO, event: 'click', page: '/uploads', elementId: 'btn-upload', intent: 'upload_file', correlationRequestId: 'req_upload001' },
      { ts: HOUR_AGO, event: 'upload_attempt', page: '/uploads', elementId: 'file-input', intent: 'upload_file', correlationRequestId: 'req_upload001' },
      { ts: NOW, event: 'error_shown', page: '/uploads', elementId: 'error-banner', intent: null, correlationRequestId: 'req_upload001' },
    ],
    clickTimeline: [
      { ts: TWO_HOURS_AGO, page: '/dashboard', action: 'Viewed dashboard' },
      { ts: HOUR_AGO, page: '/uploads', action: 'Clicked upload button' },
      { ts: HOUR_AGO, page: '/uploads', action: 'Selected file report.pdf' },
      { ts: NOW, page: '/uploads', action: 'Upload failed - error shown' },
    ],
  };
}

export function mockUserLogs(): GetUserLogsResponse {
  return {
    recentRequests: [
      { ts: HOUR_AGO, route: 'POST /api/uploads', httpStatus: 413, errorCode: 'UPLOAD_TOO_LARGE', resourceId: 'upload_xyz789', timingMs: 230, requestId: 'req_upload001' },
      { ts: TWO_HOURS_AGO, route: 'GET /api/projects', httpStatus: 200, errorCode: null, resourceId: null, timingMs: 45, requestId: 'req_proj001' },
    ],
    jobs: [
      { jobId: 'job_proc_001', queue: 'file-processing', status: 'failed', errorCode: 'UPLOAD_TOO_LARGE', lastStage: 'validation', createdAt: HOUR_AGO, updatedAt: HOUR_AGO, durationMs: 150 },
    ],
    errors: [
      { ts: HOUR_AGO, errorCode: 'UPLOAD_TOO_LARGE', errorClass: 'validation', route: 'POST /api/uploads', requestId: 'req_upload001', resourceId: 'upload_xyz789' },
    ],
  };
}

export function mockBusinessRules(): GetBusinessRulesResponse {
  return {
    rules: {
      max_upload_size_mb: 25,
      max_uploads_per_day: 100,
      rate_limit_rpm: 60,
    },
    errorCatalog: [
      { errorCode: 'UPLOAD_TOO_LARGE', errorClass: 'validation', retryable: true, userActionable: true, resolution: 'Reduce file size below 25MB or upgrade plan for higher limits.' },
      { errorCode: 'RATE_LIMITED', errorClass: 'business', retryable: true, userActionable: true, resolution: 'Wait 60 seconds before retrying.' },
    ],
  };
}

/** Creates an HTTP server that serves mock client API responses. */
export function createMockClientApiServer(
  userId: string,
  tenantId: string,
): { server: http.Server; start: () => Promise<string> } {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const path = url.pathname;

    res.setHeader('Content-Type', 'application/json');

    if (path === '/support/user-state') {
      res.end(JSON.stringify(mockUserState(userId, tenantId)));
    } else if (path === '/support/user-history') {
      res.end(JSON.stringify(mockUserHistory()));
    } else if (path === '/support/user-logs') {
      res.end(JSON.stringify(mockUserLogs()));
    } else if (path === '/support/business-rules') {
      res.end(JSON.stringify(mockBusinessRules()));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  return {
    server,
    start: () =>
      new Promise<string>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            resolve(`http://127.0.0.1:${addr.port}`);
          }
        });
      }),
  };
}
