import { MarketingHeader } from '@/components/marketing-header';
import { WorkspaceConsole } from '@/components/workspace-console';

export default function WorkspacePage() {
  return <div className="min-h-screen bg-[#0b1117] text-slate-100">
    <MarketingHeader />
    <main className="mx-auto max-w-5xl px-6 py-12"><WorkspaceConsole /></main>
  </div>;
}
