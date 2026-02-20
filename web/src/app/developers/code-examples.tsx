const jsExample = `// JavaScript / Node.js
const res = await fetch('https://your-api.com/support/user-state?userId=usr_123', {
  headers: { 'Authorization': 'Bearer <service-token>' }
});
const data = await res.json();
// data: { userId, tenantId, roles, plan, entities, activeErrors, limitsReached }`;

const pythonExample = `# Python
import requests

resp = requests.get(
    "https://your-api.com/support/user-state",
    params={"userId": "usr_123"},
    headers={"Authorization": "Bearer <service-token>"}
)
data = resp.json()
# data: { userId, tenantId, roles, plan, entities, activeErrors, limitsReached }`;

const curlExample = `# cURL
curl -X GET "https://your-api.com/support/user-state?userId=usr_123" \\
  -H "Authorization: Bearer <service-token>" \\
  -H "Content-Type: application/json"`;

const examples = [
  { lang: 'JavaScript', code: jsExample, label: 'javascript' },
  { lang: 'Python', code: pythonExample, label: 'python' },
  { lang: 'cURL', code: curlExample, label: 'curl' },
];

export function CodeExamples() {
  return (
    <section data-testid="code-examples">
      <h2 className="mb-6 text-3xl font-bold">Code Examples</h2>
      <p className="mb-6 text-gray-400">
        Examples showing how to call the user-state endpoint from different languages.
        The same pattern applies to all 4 required endpoints.
      </p>
      <div className="space-y-6">
        {examples.map((ex) => (
          <div key={ex.label} className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-2 text-sm font-semibold text-gray-300">
              {ex.lang}
            </div>
            <pre className="overflow-x-auto p-4 text-sm text-green-400">{ex.code}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
