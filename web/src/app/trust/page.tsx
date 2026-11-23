import { MarketingHeader } from '@/components/marketing-header';

export default function TrustPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Trust and data</h1>
      <section><h2 className="text-2xl font-semibold">You choose what to share</h2><p className="mt-3 leading-7 text-slate-300">Your product decides what account and activity details Support AI can use for each signed-in customer. Share the details needed to answer the question and keep credentials on your server.</p></section>
      <section><h2 className="text-2xl font-semibold">How we use conversation data</h2><p className="mt-3 leading-7 text-slate-300">Support AI uses messages and the details you share to generate replies. We may store chats, relevant account or activity details, and operational records for conversation history and troubleshooting.</p></section>
      <section><h2 className="text-2xl font-semibold">How customers access support</h2><p className="mt-3 leading-7 text-slate-300">Each signed-in customer gets a short-lived chat session tied to their account. The credential that connects your product to Support AI stays on your application server.</p></section>
    </main>
  </div>;
}
