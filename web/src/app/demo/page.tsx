import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

export default function DemoPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100" data-testid="demo-page">
    <MarketingHeader />
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Widget demo</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-300">Open the support chat in this sample workspace. Ask why the import failed and see the evidence behind the answer.</p>
      <iframe title="Interactive widget in a sample workspace" src="/starter/index.html" className="mt-7 h-[620px] w-full rounded-xl border border-slate-700 bg-[#101922]" />
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium text-teal-300">
        <a href="/downloads/ai-support-starter.zip" download className="hover:underline">Download the local starter</a>
        <Link href="/developers/quick-start" className="hover:underline">Connect your application</Link>
      </div>
    </main>
  </div>;
}
