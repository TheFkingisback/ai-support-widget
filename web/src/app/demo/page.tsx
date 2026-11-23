import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

export default function DemoPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100" data-testid="demo-page">
    <MarketingHeader />
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">See Support AI in action</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-300">Open the chat in the sample product and ask why your import didn’t finish. See the answer and what you can do next.</p>
      <iframe title="Support chat in a sample product" src="/starter/index.html" className="mt-7 h-[760px] w-full rounded-xl border border-slate-700 bg-[#101922] min-[380px]:h-[620px]" />
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium text-teal-300">
        <Link href="/signup" className="rounded-lg bg-teal-300 px-4 py-2.5 font-semibold text-slate-950 hover:bg-teal-200">Get started free</Link>
        <a href="/downloads/ai-support-starter.zip" download className="hover:underline">Download the starter kit</a>
        <Link href="/developers/quick-start" className="hover:underline">Integration guide</Link>
      </div>
    </main>
  </div>;
}
