import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function MarketingHeader() {
  return (
    <header className="border-b border-slate-800 bg-[#0b1117] text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="rounded-lg bg-teal-300 p-1.5 text-slate-950"><MessageCircle size={19} aria-hidden="true" /></span>
          AI Support Widget
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-5 text-sm text-slate-300">
          <Link href="/demo" className="hover:text-teal-300">Demo</Link>
          <Link href="/developers" className="hover:text-teal-300">Developers</Link>
          <Link href="/signup" className="hover:text-teal-300">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
