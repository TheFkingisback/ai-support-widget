import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing-header';
import { WorkspaceSignin } from '@/components/workspace-signin';

export default function SignupPage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Get started free</h1>
      <p className="mb-7 mt-4 leading-7 text-slate-300">Enter your email to create a workspace or sign in. Try Support AI with sample data, then connect it to your product.</p>
      <WorkspaceSignin />
      <div className="mt-6 flex gap-5 text-sm text-teal-300"><Link href="/demo">Try the demo</Link><Link href="/workspace">Open your workspace</Link></div>
    </main>
  </div>;
}
