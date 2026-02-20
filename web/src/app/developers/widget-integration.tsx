const widgetCode = `<script src="https://cdn.yourdomain.com/ai-support-widget.js"></script>
<script>
  AISupportWidget.init({
    tenantKey: 'ten_your_key',
    jwt: yourUserJwt,
    theme: 'light',
    position: 'bottom-right'
  });
</script>`;

const configOptions = [
  { name: 'tenantKey', type: 'string', desc: 'Your tenant ID (ten_xxx)' },
  { name: 'jwt', type: 'string', desc: 'JWT signed by your backend with shared secret' },
  { name: 'theme', type: "'light' | 'dark'", desc: 'Widget color theme (default: light)' },
  { name: 'position', type: "'bottom-right' | 'bottom-left'", desc: 'FAB button position' },
  { name: 'onTokenRefresh', type: '() => Promise<string>', desc: 'Called on 401 to refresh JWT' },
];

export function WidgetIntegration() {
  return (
    <section data-testid="widget-integration">
      <h2 className="mb-6 text-3xl font-bold">Widget Integration</h2>
      <p className="mb-4 text-gray-400">
        Add the widget to any page with two script tags:
      </p>
      <pre className="mb-6 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400 border border-gray-800">
        {widgetCode}
      </pre>
      <h3 className="mb-3 text-xl font-semibold">Configuration Options</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="py-2 pr-4">Option</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {configOptions.map((opt) => (
            <tr key={opt.name} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 font-mono text-blue-400">{opt.name}</td>
              <td className="py-2 pr-4 font-mono text-yellow-400">{opt.type}</td>
              <td className="py-2 text-gray-300">{opt.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
