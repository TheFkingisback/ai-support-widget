import { L } from '@/lib/localization';
import Link from 'next/link';
import { ArtifactLink, KitChecksum } from '@/components/artifact-link';
import type { Metadata } from 'next';
import { Download, FileJson, FileCode2, Package, ArrowUpRight } from 'lucide-react';
import { requestLocale } from '@/lib/locale-server';
import { loadCatalog } from '@/lib/catalog';
import { sdkRelease } from '@/lib/sdk-release';
export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadCatalog(await requestLocale());
  return { title: messages.Downloads, description: messages['SDK, guia, schema, exemplos Node.js/JavaScript, testes e checklist.'] };
}
const files=[
 {href:sdkRelease.sdk,name:'Widget SDK',type:'JAVASCRIPT',desc:'Arquivo fixado, pronto para servir no seu domínio.',icon:FileCode2},
 {href:sdkRelease.manifest,name:'Manifesto do SDK',type:'JSON · SHA-256',desc:'Confira versão, tamanho e integridade dos bytes.',icon:FileJson},
 {href:'/integration-v4/context.schema.json',name:'Schema de contexto',type:'JSON SCHEMA',desc:'Valide os três blocos de contexto antes do envio.',icon:FileJson},
 {href:'/integration-v4/context.example.json',name:'Contexto mínimo',type:'JSON',desc:'Uma fixture para começar seus testes de contrato.',icon:FileJson},
 {href:'/integration-v4/backend-session.mjs',name:'Emissor no backend',type:'NODE.JS 20+ · ESM',desc:'Timeout, limite de resposta e conferência do tenant.',icon:FileCode2},
 {href:sdkRelease.controller,name:'Controlador frontend',type:'JAVASCRIPT · ESM',desc:'Bootstrap, renovação, atualização de contexto e cleanup.',icon:FileCode2},
 {href:'/integration-v4/ACEITE.md',name:'Checklist de aceite',type:'MARKDOWN',desc:'Registre os resultados de homologação do seu aplicativo.',icon:FileCode2},
 {href:'/integration-v4/MCP.md',name:'Servidores MCP por sessão',type:'MARKDOWN · MCP',desc:'Proposta, confirmação humana, execução e idempotência.',icon:FileCode2},
];
export default function Downloads(){return <div className="dc-downloads"><div className="dc-breadcrumb"><Link href="/developers"><L>{"Documentação"}</L></Link><span>/</span><L>{"Downloads"}</L></div><header className="dc-article-header"><p className="dc-eyebrow"><L>{"RECURSOS PARA SEU TIME"}</L></p><h1><L>{"Do guia para o código."}</L></h1><p><L>{"Baixe o que precisa. Os exemplos usam placeholders; nenhuma credencial vem nos arquivos."}</L></p></header>
 <section className="dc-kit"><Package size={38}/><div><span className="dc-eyebrow"><L>{"KIT DE INTEGRAÇÃO V4"}</L></span><h2>SDK {sdkRelease.version}</h2><p><L>{"SDK, guia, schema, exemplos Node.js/JavaScript, testes e checklist."}</L></p><ArtifactLink href="/downloads/release-manifest.json" className="dc-text-link" dir="ltr">SHA-256 · ZIP</ArtifactLink><KitChecksum /></div><ArtifactLink className="dc-button" href={sdkRelease.kit} download><L>{"Baixar ZIP"}</L>{" "}<Download size={17}/></ArtifactLink></section>
 <div className="dc-inline-links"><ArtifactLink href="/integration-v4/INICIAR.html"><L>{"Integration guide"}</L> · HTML</ArtifactLink><ArtifactLink href="/integration-v4/GUIA.md" download><L>{"Integration guide"}</L> · Markdown</ArtifactLink><ArtifactLink href={sdkRelease.starter} download><L>{"Baixar starter executável"}</L></ArtifactLink><Link href="/developers/changelog"><L>{"Versões e mudanças"}</L></Link><Link href="/developers/api-reference"><L>{"Referência da API"}</L></Link></div>
 <div className="dc-download-grid">{files.map(f=><ArtifactLink key={f.href} className="dc-download-card" href={f.href} download><f.icon size={23}/><small>{f.type}</small><h2><L>{f.name}</L></h2><p><L>{f.desc}</L></p><span><L>{"Baixar arquivo"}</L>{" "}<Download size={15}/></span></ArtifactLink>)}</div>
 <Link className="dc-text-link" href="/developers/integration"><L>{"Conferir antes de publicar"}</L>{" "}<ArrowUpRight size={16}/></Link></div>;}
