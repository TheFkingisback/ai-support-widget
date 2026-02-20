'use client';
import { useEffect, useRef } from 'react';

export default function DemoPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ destroy?: () => void } | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.onload = () => {
      const win = window as unknown as Record<string, unknown>;
      if (typeof win.AISupportWidget === 'object' && win.AISupportWidget !== null) {
        const widget = win.AISupportWidget as { init: (cfg: Record<string, unknown>) => { destroy?: () => void } };
        widgetRef.current = widget.init({
          tenantKey: 'ten_demo',
          apiUrl: 'http://localhost:3000',
          jwt: 'demo-jwt-token',
          theme: 'dark',
          position: 'bottom-right',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (widgetRef.current?.destroy) widgetRef.current.destroy();
      script.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-8" data-testid="demo-page">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-white">Widget Demo</h1>
        <p className="mb-8 text-gray-400">
          This page demonstrates how a host application embeds the AI Support Widget.
          The widget FAB button should appear in the bottom-right corner.
        </p>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 mb-6">
          <h2 className="mb-3 text-lg font-semibold">Integration Code</h2>
          <pre className="overflow-x-auto rounded bg-gray-950 p-4 text-sm text-green-400">
{`<script src="https://cdn.example.com/widget.js"></script>
<script>
  AISupportWidget.init({
    apiUrl: 'https://support-api.yourapp.com',
    tenantKey: '<your-tenant-key>',
    jwt: '<jwt-from-your-backend>',
    theme: 'dark',
    position: 'bottom-right',
    onTokenRefresh: async () => {
      const res = await fetch('/api/refresh-token');
      const { token } = await res.json();
      return token;
    }
  });
</script>`}
          </pre>
        </div>

        <div ref={containerRef} className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-500">Host application content area</p>
          <p className="mt-2 text-sm text-gray-600">The widget operates independently via Shadow DOM</p>
        </div>
      </div>
    </div>
  );
}
