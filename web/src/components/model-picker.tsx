'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { listModels } from '@/lib/api';
import type { OpenRouterModel } from '@/lib/types';

interface ModelPickerProps {
  value?: string;
  onChange: (modelId: string | undefined) => void;
}

export default function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    listModels()
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = models.filter((m) => {
    const q = search.toLowerCase();
    return m.id.toLowerCase().includes(q)
      || m.name.toLowerCase().includes(q)
      || m.provider.toLowerCase().includes(q);
  });

  const selected = models.find((m) => m.id === value);
  const displayValue = selected ? selected.name : value ?? '';

  function formatPrice(price: number): string {
    if (price === 0) return 'free';
    if (price < 0.001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="input-field flex w-full items-center justify-between text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Select preferred model"
        >
          <span className={displayValue ? 'text-white' : 'text-gray-500'}>
            {displayValue || 'Use policy default'}
          </span>
          <ChevronDown size={14} aria-hidden="true"
            className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Clear model selection">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
          role="listbox" aria-label="Model list">
          <div className="border-b border-gray-700 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder="Search models..."
              className="input-field w-full text-sm"
              aria-label="Search models"
              autoFocus
            />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1" role="group">
            {loading && (
              <li className="px-3 py-2 text-sm text-gray-500" role="status">Loading models...</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No models found</li>
            )}
            {filtered.map((m) => (
              <li key={m.id} role="option" aria-selected={m.id === value}
                tabIndex={0}
                onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); onChange(m.id); setOpen(false); setSearch('');
                  }
                }}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors ${
                  m.id === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}>
                <div className="font-medium">{m.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{m.provider}</span>
                  <span>{formatPrice(m.promptPricing)}/tok in</span>
                  <span>{formatPrice(m.completionPricing)}/tok out</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
