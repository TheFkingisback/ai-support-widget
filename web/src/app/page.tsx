import { BookOpen, Layers3, MessageSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';
import { DemoConversation } from '@/components/demo-conversation';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b1117] text-slate-100">
      <MarketingHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:py-28 xl:grid-cols-[1.14fr_1fr]">
          <div>
            <p className="mb-5 text-sm font-medium tracking-wide text-teal-300">AI customer support for SaaS and digital products</p>
            <h1 className="max-w-xl text-[1.875rem] font-semibold leading-[1.08] tracking-tight min-[370px]:text-4xl sm:text-5xl lg:text-[2.375rem] xl:text-5xl">
              <span className="block">Scale your support.</span>{' '}
              <span className="block">Keep customers moving.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Give customers answers tailored to their account, right inside your product. Support AI handles everyday questions so your team can focus on the conversations that need a person.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200">Get started free</Link>
              <Link href="/demo" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:border-teal-300">See it in action</Link>
            </div>
          </div>
          <DemoConversation />
        </section>
        <section id="how-it-works" className="border-y border-slate-800 bg-[#101922]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Help at every step of the customer journey</h2>
            <div className="mt-9 grid gap-8 sm:grid-cols-3">
              <div><Layers3 aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Get customers up and running</h3><p className="mt-2 leading-7 text-slate-300">Guide people through setup, show them where to start, and help them take the next step in your product.</p></div>
              <div><ShieldCheck aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Resolve everyday questions</h3><p className="mt-2 leading-7 text-slate-300">Help with features, access, and account questions using the details your product makes available to each customer.</p></div>
              <div><MessageSquare aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold">Make time for the hard cases</h3><p className="mt-2 leading-7 text-slate-300">Point customers to your team when they need a person. Your team can review past conversations in the workspace.</p></div>
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-7 px-6 py-16">
          <div><h2 className="text-3xl font-semibold tracking-tight">Put Support AI to work in your product</h2><p className="mt-3 max-w-xl leading-7 text-slate-300">Start with sample data, then connect your product in a dedicated test environment. Support AI is free in testing and production.</p></div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/signup" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200">Create a free workspace</Link>
            <Link href="/developers/quick-start" className="inline-flex items-center gap-2 font-medium text-teal-300 hover:underline"><BookOpen aria-hidden="true" size={19} /> Integration guide</Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800"><div className="mx-auto flex max-w-6xl flex-wrap gap-5 px-6 py-8 text-sm text-slate-400"><span className="mr-auto">Support AI</span><Link href="/trust" className="hover:text-slate-100">Trust and data</Link><Link href="/developers" className="hover:text-slate-100">Developer Center</Link></div></footer>
    </div>
  );
}
