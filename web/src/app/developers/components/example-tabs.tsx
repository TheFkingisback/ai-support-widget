'use client';
import { useState } from 'react';
import { CodeBlock } from './code-block';
import { sessionCurl, sessionResponse } from '../content/snippets';
export function ExampleTabs() {
  const [tab,setTab]=useState<'request'|'response'>('request');
  return <div className="dc-example"><div className="dc-example-top"><span>SESSÕES / V3</span><span className="dc-outline-tag">Backend only</span></div>
    <div className="dc-tabs" role="tablist" aria-label="Exemplo da API" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'request':e.key==='End'?'response':tab==='request'?'response':'request';setTab(next);document.getElementById(next+'-tab')?.focus();}}>
      <button role="tab" tabIndex={tab==='request'?0:-1} id="request-tab" aria-controls="session-example" aria-selected={tab==='request'} onClick={()=>setTab('request')}>Requisição</button>
      <button role="tab" tabIndex={tab==='response'?0:-1} id="response-tab" aria-controls="session-example" aria-selected={tab==='response'} onClick={()=>setTab('response')}>Resposta 200</button>
    </div><div id="session-example" role="tabpanel" aria-labelledby={tab+'-tab'}><CodeBlock code={tab==='request'?sessionCurl:sessionResponse} language={tab==='request'?'cURL':'JSON'} /></div>
    <div className="dc-example-foot"><span className="dc-pulse" />Identidade do seu app. Sessão de 15 minutos.</div></div>;
}
