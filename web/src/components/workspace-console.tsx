'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { workspaceApi, type Workspace } from '@/lib/workspace-api';
import { WorkspaceEnvironmentPanel } from './workspace-environment';
import { WorkspaceConversations, WorkspaceTeam } from './workspace-operations';

type WidgetInstance = { open(): Promise<void>; destroy(): void };
type WidgetHost = Window & { AISupportWidget?: { init(config: Record<string, unknown>): WidgetInstance } };

async function loadSandboxWidget(host: WidgetHost) {
  if (host.AISupportWidget) return host.AISupportWidget;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/widget.v0.2.3.js';
    const timeout = window.setTimeout(fail, 8_000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error('The widget script failed to load. Retry or refresh the page.'));
    }
    script.onerror = fail;
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    document.head.appendChild(script);
  });
  if (!host.AISupportWidget) throw new Error('The downloaded widget did not initialize.');
  return host.AISupportWidget;
}

export function WorkspaceConsole() {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const widget = useRef<WidgetInstance | undefined>(undefined);

  async function reload() { setWorkspace(await workspaceApi.get()); }
  useEffect(() => {
    reload().catch(failure => setError(failure.message)).finally(() => setLoading(false));
    return () => widget.current?.destroy();
  }, []);

  async function openSandbox() {
    setOpening(true); setError('');
    try {
      if (!widget.current) {
        const factory = await loadSandboxWidget(window as WidgetHost);
        const session = await workspaceApi.sandbox();
        widget.current = factory.init({ apiUrl: window.location.origin, tenantKey: session.tenantKey, jwt: session.jwt,
          onTokenRefresh: async () => (await workspaceApi.sandbox()).jwt,
          context: { userState: { userId: session.userId, tenantId: session.tenantKey, roles: ['member'], plan: 'standard', featuresEnabled: [],
            entities: [{ type: 'import', id: 'import_1042', status: 'failed', description: 'CSV validation stopped at row 42 due to a missing email.' }],
            activeErrors: [{ errorCode: 'INVALID_EMAIL', errorClass: 'validation', retryable: true, userActionable: true, resourceId: 'import_1042', occurredAt: new Date().toISOString() }], limitsReached: [] },
          userHistory: { windowHours: 24, events: [] }, userLogs: { recentRequests: [], jobs: [], errors: [] } },
        });
      }
      await widget.current.open();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The sandbox is unavailable'); }
    finally { setOpening(false); }
  }
  async function signOut() {
    try { await workspaceApi.logout(); widget.current?.destroy(); window.location.assign('/signup'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign out'); }
  }

  if (loading) return <p role="status">Opening your workspace…</p>;
  if (!workspace) return <div className="space-y-4"><h1 className="text-3xl font-semibold">Your workspace</h1><p role="status">{error}</p><Link href="/signup" className="text-teal-300 underline">Sign in by email</Link></div>;
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-4xl font-semibold tracking-tight">{workspace.name}</h1><p className="mt-2 text-sm text-slate-300">{workspace.email}</p></div>
      <button type="button" className="rounded border border-slate-700 px-3 py-2" onClick={() => void signOut()}>Sign out</button>
    </div>
    <section className="space-y-3 rounded-xl border border-slate-700 bg-[#131d27] p-5">
      <h2 className="text-xl font-semibold">Try your sandbox</h2>
      <p className="text-slate-300">Ask why import_1042 failed. The assistant uses fictional app data and a live model response.</p>
      <button disabled={opening} type="button" className="rounded-lg bg-teal-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" onClick={() => void openSandbox()}>{opening ? 'Opening…' : 'Open sandbox chat'}</button>
    </section>
    {error && <p role="alert" className="text-rose-200">{error}</p>}
    {workspace.role !== 'support' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Connect your application</h2><Link className="text-teal-300 underline" href="/developers/quick-start">Integration instructions</Link><button type="button" className="text-teal-300 underline" onClick={() => void reload().catch(failure => setError(failure.message))}>Refresh status</button></div>
      <div className="grid gap-4 md:grid-cols-2"><WorkspaceEnvironmentPanel env="staging" data={workspace.staging} reload={reload} /><WorkspaceEnvironmentPanel env="production" data={workspace.production} reload={reload} /></div>
    </>}
    <WorkspaceConversations />
    {workspace.role === 'owner' && <WorkspaceTeam />}
  </div>;
}
