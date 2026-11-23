import { BookOpen, Code2, Layers3, MessageSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';
import { DemoConversation } from '@/components/demo-conversation';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b1117] text-slate-100">
      <MarketingHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 text-sm font-medium tracking-wide text-teal-300">In-app support for SaaS teams</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
              AI support that knows what happened in your app.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Help customers understand failed jobs, access issues, and account restrictions right where they happen. Give them an answer grounded in their own product activity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200">Create a free workspace</Link>
              <Link href="/demo" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:border-teal-300">Try the demo</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">Free from your first test to production.</p>
          </div>
          <DemoConversation />
        </section>
        <section id="how-it-works" className="border-y border-slate-800 bg-[#101922]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">From product activity to a useful answer</h2>
            <div className="mt-9 grid gap-8 sm:grid-cols-3">
              <div><Layers3 aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Bring your app context</h3><p className="mt-2 leading-7 text-slate-300">Send the specific job, error, or permission details the signed-in user is allowed to see.</p></div>
              <div><ShieldCheck aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Give an answer with evidence</h3><p className="mt-2 leading-7 text-slate-300">Point to the status, event, or error code that explains the issue and give the user a concrete next step.</p></div>
              <div><MessageSquare aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Make human help easy to find</h3><p className="mt-2 leading-7 text-slate-300">Keep your team's support channel available when the customer needs a person.</p></div>
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-7 px-6 py-16">
          <div><h2 className="text-3xl font-semibold tracking-tight">Connect your application</h2><p className="mt-3 max-w-xl leading-7 text-slate-300">Run a local sample, create an authenticated session, and add the widget with context from your own app.</p></div>
          <div className="flex flex-wrap gap-5">
            <Link href="/developers/quick-start" className="inline-flex items-center gap-2 font-medium text-teal-300 hover:underline"><Code2 aria-hidden="true" size={19} /> Quick Start</Link>
            <Link href="/developers" className="inline-flex items-center gap-2 font-medium text-teal-300 hover:underline"><BookOpen aria-hidden="true" size={19} /> Developer docs</Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800"><div className="mx-auto flex max-w-6xl flex-wrap gap-5 px-6 py-8 text-sm text-slate-400"><span className="mr-auto">AI Support Widget</span><Link href="/trust" className="hover:text-slate-100">Trust and data</Link><Link href="/developers" className="hover:text-slate-100">Developer Center</Link></div></footer>
    </div>
  );
}
