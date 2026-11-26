import { L } from '@/lib/localization';
import { ArtifactLink } from '@/components/artifact-link';
import { LocalizedDemo } from '@/components/localized-demo';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';

export default function DemoPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100" data-testid="demo-page">
    <MarketingHeader />
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight"><L>{"See Support AI in action"}</L></h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-300"><L>{"Open the chat in the sample product and ask why your import didn’t finish. See the answer and what you can do next."}</L></p>
      <LocalizedDemo />
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium text-teal-300">
        <Link href="/signup" className="rounded-lg bg-teal-300 px-4 py-2.5 font-semibold text-slate-950 hover:bg-teal-200"><L>{"Get started free"}</L></Link>
        <ArtifactLink href="/downloads/ai-support-starter.zip" download className="hover:underline"><L>{"Download the starter kit"}</L></ArtifactLink>
        <Link href="/developers/quick-start" className="hover:underline"><L>{"Integration guide"}</L></Link>
      </div>
    </main>
  </div>;
}
