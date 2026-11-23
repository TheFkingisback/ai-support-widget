import { MarketingHeader } from '@/components/marketing-header';

export default function TrustPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Trust and data</h1>
      <section><h2 className="text-2xl font-semibold">Application context</h2><p className="mt-3 leading-7 text-slate-300">The integration sends context your backend prepares for the authenticated user. Send only the job status, error details, or product state needed for support. Keep secrets and raw credentials on your server.</p></section>
      <section><h2 className="text-2xl font-semibold">Conversation processing</h2><p className="mt-3 leading-7 text-slate-300">The service processes support messages and selected context to generate a response. Chats, relevant context, and operational records can be stored to support conversation history and troubleshooting.</p></section>
      <section><h2 className="text-2xl font-semibold">Installation credentials</h2><p className="mt-3 leading-7 text-slate-300">The widget uses a short-lived session associated with the authenticated user. The integration credential belongs on the application server.</p></section>
    </main>
  </div>;
}
