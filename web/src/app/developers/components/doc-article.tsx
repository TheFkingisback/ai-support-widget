import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import type { Article } from '../content/model';
import { navigation } from '../content/navigation';
import { CodeBlock } from './code-block';
export function DocArticle({article}:{article:Article}) {
  const index=navigation.findIndex(x=>x.slug===article.slug);const next=navigation[index+1];
  return <div className="dc-article-layout" data-testid={article.slug+'-page'}><article className="dc-article">
    <div className="dc-breadcrumb"><Link href="/developers">Documentação</Link><span>/</span>{article.title}</div>
    <header className="dc-article-header"><p className="dc-eyebrow">{article.category}</p><h1>{article.title}</h1><p>{article.summary}</p><div className="dc-article-meta">Contrato v3 <span>·</span> SDK 0.2.2 <span>·</span> Atualizado em 15 set 2026</div></header>
    {article.sections.map(s=><section className="dc-section" id={s.id} key={s.id}><h2><a href={'#'+s.id}>{s.title}</a></h2>{s.text.map((p,i)=><p key={i}>{p}</p>)}
      {s.bullets&&<ul>{s.bullets.map(b=><li key={b}>{b}</li>)}</ul>}
      {s.rows&&<div className="dc-table-wrap"><table><thead><tr>{s.rows[0].map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{s.rows.slice(1).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
      {s.code&&<CodeBlock code={s.code} language={s.language}/>}
      {s.note&&<div className="dc-note" role="note"><Info size={18}/><p>{s.note}</p></div>}
      {s.links&&<div className="dc-inline-links">{s.links.map(l=><Link href={l.href} key={l.href}>{l.label}<ArrowUpRight size={14}/></Link>)}</div>}
    </section>)}
    {next&&<Link className="dc-next" href={'/developers/'+next.slug}><span><small>CONTINUE POR AQUI</small><strong>{next.title}</strong></span><ArrowRight size={22}/></Link>}
    </article><nav className="dc-toc" aria-label="Nesta página"><p>NESTA PÁGINA</p>{article.sections.map(s=><a key={s.id} href={'#'+s.id}>{s.title.replace(/^\d+ · /,'')}</a>)}<span>Referência pública.<br/>Credenciais ficam no seu backend.</span></nav></div>;
}
