import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-6 text-4xl font-bold">AI Support Widget</h1>
        <p className="mb-8 text-lg text-gray-400">Embeddable AI support for your SaaS application</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-center">
          <Link href="/admin" className="btn-primary px-6 py-3 text-center">
            Admin Dashboard
          </Link>
          <Link href="/demo" className="btn-secondary px-6 py-3 text-center">
            Widget Demo
          </Link>
          <Link href="/developers" className="rounded-lg bg-green-700 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-green-600">
            Developer Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
