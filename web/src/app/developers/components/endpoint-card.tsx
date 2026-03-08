'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';

interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  body?: string;
  response: string;
  auth?: string;
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const methodDot: Record<string, string> = {
  GET: 'bg-green-400', POST: 'bg-blue-400', PUT: 'bg-yellow-400',
  PATCH: 'bg-orange-400', DELETE: 'bg-red-400',
};

export function EndpointCard({ method, path, description, params, body, response, auth }: EndpointCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyResponse = useCallback(async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/30 transition-all hover:border-gray-700">
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${methodColors[method]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${methodDot[method]}`} />
            {method}
          </span>
          <code className="text-sm font-medium text-white">{path}</code>
          {auth && (
            <span className="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
              {auth}
            </span>
          )}
        </div>

        <p className="mb-4 text-sm leading-relaxed text-gray-400">{description}</p>

        {params && params.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Parameters</h4>
            <div className="space-y-1.5">
              {params.map((p) => (
                <div key={p.name} className="flex items-baseline gap-3 text-sm">
                  <code className="text-blue-400">{p.name}</code>
                  <span className="text-[11px] text-gray-600">{p.type}</span>
                  {p.required && (
                    <span className="text-[10px] font-medium text-red-400">required</span>
                  )}
                  <span className="text-gray-500">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {body && (
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Request Body</h4>
            <pre className="rounded-lg bg-[#0d1117] p-3 text-xs text-gray-300 overflow-x-auto">{body}</pre>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          {expanded ? 'Hide' : 'Show'} response
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 bg-[#0d1117]">
          <div className="flex items-center justify-between border-b border-gray-800/50 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Response</span>
            <button
              onClick={copyResponse}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
              aria-label={copied ? 'Copied' : 'Copy response'}
            >
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-gray-300">{response}</pre>
        </div>
      )}
    </div>
  );
}
