const errorExample = `{
  "statusCode": 404,
  "error": "CASE_NOT_FOUND",
  "message": "Case cas_abc123 not found",
  "requestId": "req_xyz789"
}`;

const errorCodes = [
  { code: 'UNAUTHORIZED', status: 401, desc: 'Invalid or expired JWT token' },
  { code: 'FORBIDDEN', status: 403, desc: 'Insufficient permissions for this action' },
  { code: 'CASE_NOT_FOUND', status: 404, desc: 'Support case does not exist' },
  { code: 'VALIDATION_ERROR', status: 400, desc: 'Request body failed validation' },
  { code: 'RATE_LIMITED', status: 429, desc: 'Too many requests — back off and retry' },
  { code: 'INTERNAL_ERROR', status: 500, desc: 'Unexpected server error' },
];

export function ErrorHandling() {
  return (
    <section data-testid="error-handling">
      <h2 className="mb-6 text-3xl font-bold">Error Handling</h2>
      <p className="mb-4 text-gray-400">
        All API errors return a consistent <code className="text-blue-400">ApiError</code> format:
      </p>
      <pre className="mb-6 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-300 border border-gray-800">
        {errorExample}
      </pre>
      <h3 className="mb-3 text-xl font-semibold">Common Error Codes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {errorCodes.map((e) => (
            <tr key={e.code} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 font-mono text-red-400">{e.code}</td>
              <td className="py-2 pr-4 text-yellow-400">{e.status}</td>
              <td className="py-2 text-gray-300">{e.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
