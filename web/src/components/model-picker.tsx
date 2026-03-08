'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { listModels } from '@/lib/api';
import type { OpenRouterModel } from '@/lib/types';

interface Props {
  value?: string;
  onChange: (modelId: string | undefined) => void;
}

export default function ModelPicker({ value, onChange }: Props) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    listModels().then(setModels).catch(() => setModels([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = models.filter((m) => {
    const q = search.toLowerCase();
    return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
  });
  const selected = models.find((m) => m.id === value);
  const display = selected ? selected.name : value ?? '';

  function fmtPrice(p: number): string {
    return p === 0 ? 'free' : p < 0.001 ? `$${p.toFixed(6)}` : `$${p.toFixed(4)}`;
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setOpen(!open)}
          className="input-field flex w-full items-center justify-between text-left"
          aria-haspopup="listbox" aria-expanded={open} aria-label="Select preferred model">
          <span className={display ? 'text-surface-900' : 'text-surface-600'}>
            {display || 'Use policy default'}
          </span>
          <ChevronDown size={14} className={`text-surface-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)}
            className="rounded-xl p-2 text-surface-600 hover:bg-surface-300 hover:text-white"
            aria-label="Clear model selection">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-surface-400 bg-surface-200 shadow-xl animate-fade-in">
          <div className="border-b border-surface-400/30 p-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder="Search models..." className="input-field text-sm" aria-label="Search models" autoFocus />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1" role="listbox" aria-label="Model list">
            {loading && <li role="presentation" className="px-3 py-2 text-sm text-surface-600">Loading...</li>}
            {!loading && filtered.length === 0 && <li role="presentation" className="px-3 py-2 text-sm text-surface-600">No models found</li>}
            {filtered.map((m) => (
              <li key={m.id} role="option" aria-selected={m.id === value ? true : false} tabIndex={0}
                onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(m.id); setOpen(false); setSearch(''); } }}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-all ${
                  m.id === value ? 'bg-brand-600 text-white' : 'text-surface-800 hover:bg-surface-300'
                }`}>
                <div className="font-medium">{m.name}</div>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <span>{m.provider}</span>
                  <span>{fmtPrice(m.promptPricing)}/tok in</span>
                  <span>{fmtPrice(m.completionPricing)}/tok out</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
