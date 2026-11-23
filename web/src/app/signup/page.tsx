import { L } from '@/lib/localization';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';
import { WorkspaceSignin } from '@/components/workspace-signin';

export default function SignupPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight"><L>{"Get started free"}</L></h1>
      <p className="mb-7 mt-4 leading-7 text-slate-300"><L>{"Enter your email to create a workspace or sign in. Try Support AI with sample data, then connect it to your product."}</L></p>
      <WorkspaceSignin />
      <div className="mt-6 flex gap-5 text-sm text-teal-300"><Link href="/demo"><L>{"Try the demo"}</L></Link><Link href="/workspace"><L>{"Open your workspace"}</L></Link></div>
    </main>
  </div>;
}
