import type { Metadata } from 'next';
import { DevShell } from './components/dev-shell';
import './devcenter.css';
export const metadata: Metadata = {
  title: {default:'Dev Center · AI Support',template:'%s · AI Support Dev Center'},
  description:'Integre suporte com contexto real: sessões, SDK, API, MCP, schemas e guias de homologação.',
};
export default function DevelopersLayout({children}:{children:React.ReactNode}) { return <DevShell>{children}</DevShell>; }
