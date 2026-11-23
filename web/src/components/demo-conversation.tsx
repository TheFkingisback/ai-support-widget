'use client';

import { useState } from 'react';
import { MessageCircle, RotateCcw } from 'lucide-react';

const examples = [
  { label: 'Failed import', question: 'Why did my customer import fail?', answer: 'Your CSV import stopped while validating row 42. The email column is empty on that row. Add the missing email and upload the file again.', evidence: 'import_1042 · INVALID_EMAIL · Row 42' },
  { label: 'Missing permission', question: 'Why can’t I export the report?', answer: 'Your current role allows you to view the report. Exports require the Analyst role in this workspace. Ask a workspace owner to review your access.', evidence: 'report_018 · EXPORT_PERMISSION_REQUIRED' },
  { label: 'Account restriction', question: 'Why isn’t the scheduled job running?', answer: 'Scheduling was paused after the workspace switched to its current plan. You can run the job manually from Jobs or ask an owner about restoring schedules.', evidence: 'job_217 · SCHEDULING_PAUSED' },
];

export function DemoConversation() {
  const [selected, setSelected] = useState<number | null>(0);
  const example = selected === null ? null : examples[selected];
  return (
    <section aria-label="Interactive support demo" className="rounded-2xl border border-slate-700 bg-[#131d27] p-4 shadow-[0_24px_60px_-35px_#2dd4bf60] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-4">
        <p className="inline-flex items-center gap-2 font-semibold"><MessageCircle size={20} aria-hidden="true" className="text-teal-300" /> In-app support</p>
        <button onClick={() => setSelected(null)} type="button" className="inline-flex items-center gap-1.5 rounded p-1 text-sm text-slate-300 hover:text-white"><RotateCcw size={15} aria-hidden="true" /> Reset</button>
      </div>
      <div aria-live="polite" className="flex min-h-[250px] flex-col justify-center gap-4 py-5">
        {example ? <>
          <p className="max-w-[90%] self-end rounded-xl rounded-br-sm bg-teal-300 px-4 py-3 font-medium text-slate-950">{example.question}</p>
          <div className="max-w-[94%] rounded-xl rounded-bl-sm bg-slate-800 px-4 py-3 text-slate-100">
            <p className="leading-7">{example.answer}</p>
            <p className="mt-3 break-words border-t border-slate-600 pt-3 font-mono text-sm text-teal-200">{example.evidence}</p>
          </div>
        </> : <p className="text-center text-slate-300">Choose a scenario to see a sample answer.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map(({ label }, index) => <button key={label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className="rounded-full border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-teal-300 aria-pressed:border-teal-300 aria-pressed:text-teal-200">{label}</button>)}
      </div>
      <p className="mt-4 text-sm text-slate-400">Sample replies using fictional application data.</p>
    </section>
  );
}
