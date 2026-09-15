import Link from 'next/link';
import type { Metadata } from 'next';
import { Download, FileJson, FileCode2, Package, ArrowUpRight } from 'lucide-react';
export const metadata:Metadata={title:'Downloads',description:'SDK versionado, kit de integração, schemas e exemplos sem credenciais.'};
const files=[
 {href:'/widget.v0.2.2.js',name:'Widget SDK 0.2.2',type:'JAVASCRIPT · 23.020 BYTES',desc:'Arquivo fixado, pronto para servir no seu domínio.',icon:FileCode2},
 {href:'/widget.manifest.json',name:'Manifesto do SDK',type:'JSON · SHA-256',desc:'Confira versão, tamanho e integridade dos bytes.',icon:FileJson},
 {href:'/integration-v3/context.schema.json',name:'Schema de contexto',type:'JSON SCHEMA',desc:'Valide os três blocos de contexto antes do envio.',icon:FileJson},
 {href:'/integration-v3/context.example.json',name:'Contexto mínimo',type:'JSON · EXEMPLO',desc:'Uma fixture para começar seus testes de contrato.',icon:FileJson},
 {href:'/integration-v3/backend-session.mjs',name:'Emissor no backend',type:'NODE.JS 20+ · ESM',desc:'Timeout, limite de resposta e conferência do tenant.',icon:FileCode2},
 {href:'/integration-v3/widget-controller.mjs',name:'Controlador frontend',type:'JAVASCRIPT · ESM',desc:'Bootstrap, renovação, atualização de contexto e cleanup.',icon:FileCode2},
 {href:'/integration-v3/ACEITE.md',name:'Checklist de aceite',type:'MARKDOWN',desc:'Registre os resultados de homologação do seu aplicativo.',icon:FileCode2},
 {href:'/actions-v1/CONTRATO.md',name:'Contrato de ações 1.2',type:'MARKDOWN · MCP',desc:'Proposta, confirmação humana, execução e idempotência.',icon:FileCode2},
];
export default function Downloads(){return <div className="dc-downloads"><div className="dc-breadcrumb"><Link href="/developers">Documentação</Link><span>/</span>Downloads</div><header className="dc-article-header"><p className="dc-eyebrow">RECURSOS PARA SEU TIME</p><h1>Do guia para o código.</h1><p>Baixe o que precisa. Os exemplos usam placeholders; nenhuma credencial vem nos arquivos.</p></header>
 <section className="dc-kit"><Package size={38}/><div><span className="dc-eyebrow">KIT DE INTEGRAÇÃO V3</span><h2>Tudo junto. Pronto para começar.</h2><p>SDK 0.2.2, guia, schema, exemplos Node.js/JavaScript, testes e checklist.</p></div><a className="dc-button" href="/downloads/ai-support-integration-v3-sdk-0.2.2.zip" download>Baixar ZIP <Download size={17}/></a></section>
 <div className="dc-download-grid">{files.map(f=><a key={f.href} className="dc-download-card" href={f.href} download><f.icon size={23}/><small>{f.type}</small><h2>{f.name}</h2><p>{f.desc}</p><span>Baixar arquivo <Download size={15}/></span></a>)}</div>
 <div className="dc-note"><p>Integrações de chat e leitura com SDK 0.2.1 continuam compatíveis. Para confirmar escrita, use 0.2.2 e homologue o contrato de ações. O kit não habilita operações por conta própria.</p></div>
 <Link className="dc-text-link" href="/developers/integration">Conferir antes de publicar <ArrowUpRight size={16}/></Link></div>;}
