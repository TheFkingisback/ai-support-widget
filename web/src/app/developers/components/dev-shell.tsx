'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Command, Menu, X } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { DocSearch } from './doc-search';
export function DevShell({children}:{children:React.ReactNode}) {
  const drawer=useRef<HTMLDialogElement>(null);const path=usePathname();
  useEffect(()=>{drawer.current?.close();},[path]);
  return <div className="devcenter" lang="pt-BR"><a href="#dc-main" className="dc-skip">Pular para o conteúdo</a>
    <header className="dc-header"><Link href="/developers" className="dc-brand"><span className="dc-logo"><Command size={23}/></span><strong>AI Support<span> / </span></strong><span>Dev Center</span></Link><DocSearch/><div className="dc-header-actions"><Link href="/admin">Painel <ArrowUpRight size={15}/></Link><button className="dc-menu" aria-label="Abrir navegação" onClick={()=>drawer.current?.showModal()}><Menu size={22}/></button></div></header>
    <div className="dc-layout"><aside className="dc-sidebar"><SidebarNav/></aside><div className="dc-content"><main id="dc-main">{children}</main><footer className="dc-footer"><span>AI Support · Feito para integrar.</span><Link href="/developers/changelog">Contrato v3 / SDK 0.2.2 <ArrowUpRight size={13}/></Link></footer></div></div>
    <dialog ref={drawer} className="dc-drawer" aria-label="Navegação móvel"><button className="dc-drawer-close" aria-label="Fechar navegação" onClick={()=>drawer.current?.close()}><X/></button><SidebarNav onNavigate={()=>drawer.current?.close()}/></dialog>
  </div>;
}
