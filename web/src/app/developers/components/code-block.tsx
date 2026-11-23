'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/lib/localization';
interface Props { code: string; language?: string; filename?: string; showLineNumbers?: boolean }
export function CodeBlock({code, language = 'Código', filename, showLineNumbers}: Props) {
  const t = useT();
  const [status, setStatus] = useState('Copy');
  async function copy() {
    try { await navigator.clipboard.writeText(code); setStatus('Copiado'); }
    catch { setStatus('Selecione o código para copiar'); }
  }
  return <div className="dc-code">
    <div className="dc-code-bar"><span><i />{filename || t(language)}</span>
      <button onClick={copy} aria-label={t('Copiar código')}>{status === 'Copiado' ? <Check size={14} /> : <Copy size={14} />}<span aria-live="polite">{t(status)}</span></button></div>
    <pre dir="ltr"><code>{showLineNumbers ? code.split('\n').map((line,i)=><span className="dc-code-line" key={i}><b aria-hidden="true">{i+1}</b>{line}{'\n'}</span>) : code}</code></pre>
  </div>;
}
