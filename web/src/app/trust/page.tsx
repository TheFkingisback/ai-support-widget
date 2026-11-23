import { L } from '@/lib/localization';
import { MarketingHeader } from '@/components/marketing-header';

export default function TrustPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight"><L>{"Trust and data"}</L></h1>
      <section><h2 className="text-2xl font-semibold"><L>{"You choose what to share"}</L></h2><p className="mt-3 leading-7 text-slate-300"><L>{"Your product decides what account and activity details Support AI can use for each signed-in customer. Share the details needed to answer the question and keep credentials on your server."}</L></p></section>
      <section><h2 className="text-2xl font-semibold"><L>{"How we use conversation data"}</L></h2><p className="mt-3 leading-7 text-slate-300"><L>{"Support AI uses messages and the details you share to generate replies. We may store chats, relevant account or activity details, and operational records for conversation history and troubleshooting."}</L></p></section>
      <section><h2 className="text-2xl font-semibold"><L>{"How customers access support"}</L></h2><p className="mt-3 leading-7 text-slate-300"><L>{"Each signed-in customer gets a short-lived chat session tied to their account. The credential that connects your product to Support AI stays on your application server."}</L></p></section>
    </main>
  </div>;
}
