import { L } from '@/lib/localization';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import type { Article } from '../content/model';
import { navigation } from '../content/navigation';
import { CodeBlock } from './code-block';
export function DocArticle({article}:{article:Article}) {
  const index=navigation.findIndex(x=>x.slug===article.slug);const next=navigation[index+1];
  return <div className="dc-article-layout" data-testid={article.slug+'-page'}><article className="dc-article">
    <div className="dc-breadcrumb"><Link href="/developers"><L>{"Documentação"}</L></Link><span>/</span><L>{article.title}</L></div>
    <header className="dc-article-header"><p className="dc-eyebrow"><L>{article.category}</L></p><h1><L>{article.title}</L></h1><p><L>{article.summary}</L></p><div className="dc-article-meta"><L>{"Contrato v3"}</L>{" "}<span>·</span><L>{"SDK 0.2.5"}</L>{" "}<span>·</span><L>{"Atualizado em 23 nov 2026"}</L></div></header>
    {article.sections.map(s=><section className="dc-section" id={s.id} key={s.id}><h2><a href={'#'+s.id}><L>{s.title}</L></a></h2>{s.text.map((p,i)=><p key={i}><L>{p}</L></p>)}
      {s.bullets&&<ul>{s.bullets.map(b=><li key={b}><L>{b}</L></li>)}</ul>}
      {s.rows&&<div className="dc-table-wrap"><table><thead><tr>{s.rows[0].map(c=><th key={c} scope="col"><L>{c}</L></th>)}</tr></thead><tbody>{s.rows.slice(1).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}><L>{c}</L></td>)}</tr>)}</tbody></table></div>}
      {s.code&&<CodeBlock code={s.code} language={s.language}/>}
      {s.note&&<div className="dc-note" role="note"><Info size={18}/><p><L>{s.note}</L></p></div>}
      {s.links&&<div className="dc-inline-links">{s.links.map(l=><Link href={l.href} key={l.href}><L>{l.label}</L><ArrowUpRight size={14}/></Link>)}</div>}
    </section>)}
    {next&&<Link className="dc-next" href={'/developers/'+next.slug}><span><small><L>{"CONTINUE POR AQUI"}</L></small><strong><L>{next.title}</L></strong></span><ArrowRight size={22}/></Link>}
    </article><nav className="dc-toc" aria-label="Nesta página"><p><L>{"NESTA PÁGINA"}</L></p>{article.sections.map(s=><a key={s.id} href={'#'+s.id}><L>{s.title}</L></a>)}<span><L>{"Referência pública."}</L><br/><L>{"Credenciais ficam no seu backend."}</L></span></nav></div>;
}
