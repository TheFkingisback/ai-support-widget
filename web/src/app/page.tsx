import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">AI Support Widget</h1>
        <div className="flex gap-4 justify-center">
          <Link href="/admin" className="rounded bg-blue-600 px-6 py-3 hover:bg-blue-700">
            Admin Dashboard
          </Link>
          <Link href="/demo" className="rounded bg-gray-700 px-6 py-3 hover:bg-gray-600">
            Widget Demo
          </Link>
          <Link href="/developers" className="rounded bg-green-700 px-6 py-3 hover:bg-green-600">
            Developer Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
