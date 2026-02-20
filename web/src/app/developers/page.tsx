import Link from 'next/link';
import { QuickStart } from './quick-start';
import { WidgetIntegration } from './widget-integration';
import { EndpointDocs } from './endpoint-docs';
import { CodeExamples } from './code-examples';
import { ErrorHandling } from './error-handling';

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="developers-page">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-400">Developer Portal</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-400 transition-colors hover:text-white">Home</Link>
            <Link
              href="/developers/integration"
              className="btn-primary"
            >
              Integration Guide
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-16">
        <QuickStart />
        <WidgetIntegration />
        <EndpointDocs />
        <CodeExamples />
        <ErrorHandling />
      </main>
    </div>
  );
}
