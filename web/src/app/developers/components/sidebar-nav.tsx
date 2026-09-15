'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, HelpCircle, Layers3 } from 'lucide-react';
import { navigation } from '../content/navigation';
export function SidebarNav({onNavigate}: {onNavigate?:()=>void}) {
  const path=usePathname();
  return <nav aria-label="Documentação"><Link href="/developers" className={'dc-nav-home '+(path==='/developers'?'active':'')} onClick={onNavigate}><Layers3 size={17}/>Visão geral</Link>
    {['PRIMEIROS PASSOS','CONSTRUA','PUBLIQUE','RECURSOS'].map(group=><div className="dc-nav-group" key={group}><p>{group}</p>{navigation.filter(x=>x.category===group).map(item=><Link href={'/developers/'+item.slug} key={item.slug} onClick={onNavigate} aria-current={path==='/developers/'+item.slug?'page':undefined}>{item.title}{item.slug==='mcp'&&<small>MCP</small>}</Link>)}</div>)}
    <div className="dc-nav-bottom"><HelpCircle size={19}/><strong>Sua integração, seu contexto.</strong><p>Configure o projeto e conecte seu sistema pelo painel.</p><Link href="/admin">Abrir painel <ArrowUpRight size={14}/></Link></div>
  </nav>;
}
