'use client';
import { L, useT } from '@/lib/localization';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, X } from 'lucide-react';
import { navigation } from '../content/navigation';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function DocSearch() {
  const t=useT();
  const dialog=useRef<HTMLDialogElement>(null);const [query,setQuery]=useState('');
  const results=navigation.filter(x=>normalize(t(x.title)+' '+t(x.summary)+' '+x.keywords).includes(normalize(query.trim())));
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.current?.showModal();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  return <><button aria-label={t('Buscar na documentação')} className="dc-search-trigger" onClick={()=>dialog.current?.showModal()}><Search size={17}/><span><L>{"Buscar na documentação"}</L></span><kbd>Ctrl K</kbd></button>
    <dialog className="dc-search" ref={dialog} aria-label={t('Buscar documentação')} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
      <div className="dc-search-input"><Search size={19}/><input autoFocus aria-label={t('Termo da busca')} placeholder={t('Sessão, contexto, MCP…')} value={query} onChange={e=>setQuery(e.target.value)}/><button aria-label={t('Fechar busca')} onClick={()=>dialog.current?.close()}><X size={18}/></button></div>
      <p className="dc-search-count" aria-live="polite">{t(results.length===1?'{count} resultado':'{count} resultados',{count:results.length})}{" "}<L>{"· Esc para fechar"}</L></p>
      <div className="dc-search-results">{results.map(x=><Link href={'/developers/'+x.slug} key={x.slug} onClick={()=>dialog.current?.close()}><span><strong>{t(x.title)}</strong><small>{t(x.summary)}</small></span><ArrowUpRight size={17}/></Link>)}{!results.length&&<p><L>{"Nenhum resultado. Tente “autenticação”, “schema” ou “MCP”."}</L></p>}</div>
    </dialog></>;
}
