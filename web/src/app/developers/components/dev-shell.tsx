'use client';
import { L, LanguagePicker, useT } from '@/lib/localization';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Command, Menu, X } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { DocSearch } from './doc-search';
export function DevShell({children}:{children:React.ReactNode}) {
  const t = useT();
  const drawer = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  useEffect(()=>{drawer.current?.close();},[path]);
  return <div className="devcenter"><a href="#dc-main" className="dc-skip"><L>{"Pular para o conteúdo"}</L></a>
    <header className="dc-header"><Link href="/developers" className="dc-brand"><span className="dc-logo"><Command size={23}/></span><strong><L>{"AI Support"}</L><span> / </span></strong><span><L>{"Dev Center"}</L></span></Link><DocSearch/><LanguagePicker/><div className="dc-header-actions"><Link href="/workspace"><L>{"Painel"}</L>{" "}<ArrowUpRight size={15}/></Link><button className="dc-menu" aria-label={t("Abrir navegação")} onClick={()=>drawer.current?.showModal()}><Menu size={22}/></button></div></header>
    <div className="dc-layout"><aside className="dc-sidebar"><SidebarNav/></aside><div className="dc-content"><main id="dc-main">{children}</main><footer className="dc-footer"><span><L>{"AI Support · Feito para integrar."}</L></span><Link href="/developers/changelog"><L>{"Contrato v3 / SDK 0.2.5"}</L>{" "}<ArrowUpRight size={13}/></Link></footer></div></div>
    <dialog ref={drawer} className="dc-drawer" aria-label={t("Navegação móvel")}><button className="dc-drawer-close" aria-label={t("Fechar navegação")} onClick={()=>drawer.current?.close()}><X/></button><SidebarNav onNavigate={()=>drawer.current?.close()}/></dialog>
  </div>;
}
