const steps = [
  { num: 1, text: 'Get your tenant key and JWT secret from admin dashboard' },
  { num: 2, text: 'Add the widget script to your page' },
  { num: 3, text: 'Implement 4 API endpoints' },
  { num: 4, text: 'Done — your users have AI support' },
];

export function QuickStart() {
  return (
    <section data-testid="quick-start">
      <h2 className="mb-6 text-3xl font-bold">Quick Start</h2>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.num} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                {s.num}
              </span>
              <span className="pt-1 text-gray-300">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
