import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const errorFormat = `{
  "statusCode": 404,
  "error": "CASE_NOT_FOUND",
  "message": "Case cas_abc123 not found",
  "requestId": "req_xyz789"
}`;

const retryExample = `async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err; // Non-retryable error
    }
  }
  throw new Error('Max retries exceeded');
}`;

const errorCodes = [
  { code: 'UNAUTHORIZED', status: 401, desc: 'Invalid or expired JWT token', retryable: false, action: 'Refresh the JWT using onTokenRefresh callback' },
  { code: 'FORBIDDEN', status: 403, desc: 'Insufficient permissions for this action', retryable: false, action: 'Check user roles match required permissions' },
  { code: 'CASE_NOT_FOUND', status: 404, desc: 'Support case does not exist', retryable: false, action: 'Verify the case ID is correct' },
  { code: 'VALIDATION_ERROR', status: 400, desc: 'Request body failed schema validation', retryable: false, action: 'Check the request body against the API reference' },
  { code: 'RATE_LIMITED', status: 429, desc: 'Too many requests', retryable: true, action: 'Back off exponentially and retry' },
  { code: 'INTERNAL_ERROR', status: 500, desc: 'Unexpected server error', retryable: true, action: 'Retry with backoff. If persistent, contact support' },
];

const rateLimits = [
  { endpoint: 'POST /api/cases', limit: '10 per minute', scope: 'Per user' },
  { endpoint: 'POST /api/cases/:id/messages', limit: '30 per minute', scope: 'Per user' },
  { endpoint: 'All other endpoints', limit: '60 per minute', scope: 'Per user' },
];

export default function ErrorReferencePage() {
  return (
    <div data-testid="error-reference-page">
      <PageHeader
        badge="Troubleshooting"
        badgeColor="red"
        title="Error Reference"
        description="Every error code, what it means, and how to handle it. All errors follow a consistent JSON format with a requestId for tracing."
      />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Error Format</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          All API errors return a consistent <code className="text-blue-400">ApiError</code> shape.
          The <code className="text-blue-400">requestId</code> is unique per request and can be
          used for debugging with the admin audit log.
        </p>
        <CodeBlock code={errorFormat} language="JSON" />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Error Codes</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Retry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {errorCodes.map((e) => (
                <tr key={e.code} className="border-b border-gray-800/50 transition-colors hover:bg-gray-900/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-red-400">{e.code}</td>
                  <td className="px-4 py-3 font-mono text-yellow-400">{e.status}</td>
                  <td className="px-4 py-3">
                    {e.retryable ? (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">Yes</span>
                    ) : (
                      <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{e.desc}</td>
                  <td className="px-4 py-3 text-gray-400">{e.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-white">Rate Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Limit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Scope</th>
              </tr>
            </thead>
            <tbody>
              {rateLimits.map((r) => (
                <tr key={r.endpoint} className="border-b border-gray-800/50 transition-colors hover:bg-gray-900/30">
                  <td className="px-4 py-3 font-mono text-blue-400">{r.endpoint}</td>
                  <td className="px-4 py-3 text-gray-300">{r.limit}</td>
                  <td className="px-4 py-3 text-gray-400">{r.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Retry Pattern</h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          For <code className="text-blue-400">429</code> and <code className="text-blue-400">500</code> errors,
          use exponential backoff. The widget handles this automatically, but here&apos;s the pattern for custom integrations:
        </p>
        <CodeBlock code={retryExample} language="JavaScript" />
      </section>
    </div>
  );
}
