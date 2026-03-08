'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, filename, showLineNumbers }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-800 bg-[#0d1117]">
      {(language || filename) && (
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/80 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/30" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
              <span className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/30" />
            </div>
            <span className="ml-2 text-xs font-medium text-gray-400">
              {filename || language}
            </span>
          </div>
          <CopyButton copied={copied} onCopy={handleCopy} />
        </div>
      )}
      {!language && !filename && (
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton copied={copied} onCopy={handleCopy} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="block">
              {showLineNumbers && (
                <span className="mr-4 inline-block w-8 select-none text-right text-gray-600">
                  {i + 1}
                </span>
              )}
              <span className="text-gray-300">{line}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CopyButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <button
      onClick={onCopy}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-gray-400
        transition-all hover:bg-gray-800 hover:text-gray-200"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
