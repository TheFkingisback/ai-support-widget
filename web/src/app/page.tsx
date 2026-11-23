import { L } from '@/lib/localization';
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
            <p className="mb-5 text-sm font-medium tracking-wide text-teal-300"><L>{"AI customer support for SaaS and digital products"}</L></p>
            <h1 className="max-w-xl text-[1.875rem] font-semibold leading-[1.08] tracking-tight min-[370px]:text-4xl sm:text-5xl lg:text-[2.375rem] xl:text-5xl">
              <span className="block"><L>{"Scale your support."}</L></span>{' '}
              <span className="block"><L>{"Keep customers moving."}</L></span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300"><L>{"Give customers answers tailored to their account, right inside your product. Support AI handles everyday questions so your team can focus on the conversations that need a person."}</L></p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200"><L>{"Get started free"}</L></Link>
              <Link href="/demo" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:border-teal-300"><L>{"See it in action"}</L></Link>
            </div>
          </div>
          <DemoConversation />
        </section>
        <section id="how-it-works" className="border-y border-slate-800 bg-[#101922]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl"><L>{"Help at every step of the customer journey"}</L></h2>
            <div className="mt-9 grid gap-8 sm:grid-cols-3">
              <div><Layers3 aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold"><L>{"Get customers up and running"}</L></h3><p className="mt-2 leading-7 text-slate-300"><L>{"Guide people through setup, show them where to start, and help them take the next step in your product."}</L></p></div>
              <div><ShieldCheck aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold"><L>{"Resolve everyday questions"}</L></h3><p className="mt-2 leading-7 text-slate-300"><L>{"Help with features, access, and account questions using the details your product makes available to each customer."}</L></p></div>
              <div><MessageSquare aria-hidden="true" className="mb-4 text-teal-300" /><h3 className="text-lg font-semibold"><L>{"Make time for the hard cases"}</L></h3><p className="mt-2 leading-7 text-slate-300"><L>{"Point customers to your team when they need a person. Your team can review past conversations in the workspace."}</L></p></div>
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-7 px-6 py-16">
          <div><h2 className="text-3xl font-semibold tracking-tight"><L>{"Put Support AI to work in your product"}</L></h2><p className="mt-3 max-w-xl leading-7 text-slate-300"><L>{"Start with sample data, then connect your product in a dedicated test environment. Support AI is free in testing and production."}</L></p></div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/signup" className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-200"><L>{"Create a free workspace"}</L></Link>
            <Link href="/developers/quick-start" className="inline-flex items-center gap-2 font-medium text-teal-300 hover:underline"><BookOpen aria-hidden="true" size={19} /><L>{"Integration guide"}</L></Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800"><div className="mx-auto flex max-w-6xl flex-wrap gap-5 px-6 py-8 text-sm text-slate-400"><span className="mr-auto">Support AI</span><Link href="/trust" className="hover:text-slate-100"><L>{"Trust and data"}</L></Link><Link href="/developers" className="hover:text-slate-100"><L>{"Developer Center"}</L></Link></div></footer>
    </div>
  );
}
