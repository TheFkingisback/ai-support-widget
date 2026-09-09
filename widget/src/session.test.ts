import { afterEach, describe, it, expect, vi } from 'vitest';
import { AISupportWidget } from './widget.js';
import { loadCaseId, saveCaseId } from './persistence.js';
import { sessionIdentity } from './session-identity.js';

const token = (userId: string, version = 1) => `fixture.${btoa(JSON.stringify({ userId, tenantId: 'ten_test', version }))}.fixture`;
const config = (extra = {}) => ({ tenantKey: 'ten_test', jwt: token('usr_a'), apiUrl: 'https://support.example.com', ...extra });
let instance: ReturnType<typeof AISupportWidget.init> | undefined;
afterEach(() => { instance?.destroy(); instance = undefined; localStorage.clear(); vi.unstubAllGlobals(); });
describe('Widget session lifecycle', () => {
  it('late cleanup of an old instance does not orphan the current instance', () => {
    const old = AISupportWidget.init(config());
    AISupportWidget.init(config({ jwt: token('usr_b') }));
    old.destroy();
    instance = AISupportWidget.init(config());
    expect(document.querySelectorAll('#ai-support-widget')).toHaveLength(1);
  });
  it('partitions stored cases by user and removes the legacy shared key', async () => {
    const identityA = sessionIdentity(token('usr_a'), 'ten_test')!;
    const identityB = sessionIdentity(token('usr_b'), 'ten_test')!;
    saveCaseId(identityA, 'cas_a');
    localStorage.setItem('ai_support_ten_test_caseId', 'cas_legacy');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    instance = AISupportWidget.init(config({ jwt: token('usr_b') }));
    await instance.open();
    expect(fetch).not.toHaveBeenCalled();
    expect(loadCaseId(identityA)).toBe('cas_a');
    expect(loadCaseId(identityB)).toBeNull();
    expect(localStorage.getItem('ai_support_ten_test_caseId')).toBeNull();
  });
  it('clears only its identity on destroy and refuses another identity during renewal', () => {
    const identity = sessionIdentity(token('usr_a'), 'ten_test')!;
    instance = AISupportWidget.init(config()); saveCaseId(identity, 'cas_a');
    localStorage.setItem('preference', 'keep');
    expect(() => instance!.updateJwt(token('usr_b'))).toThrow(/identity changed/);
    expect(loadCaseId(identity)).toBeNull();
    expect(localStorage.getItem('preference')).toBe('keep');
    expect(document.getElementById('ai-support-widget')).toBeNull();
  });
  it('awaits onOpen once and cannot create a panel after logout', async () => {
    let finish!: () => void;
    const onOpen = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    instance = AISupportWidget.init(config({ onOpen }));
    const first = instance.open(); const second = instance.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    instance.destroy(); finish(); await Promise.all([first, second]);
    expect(document.getElementById('ai-support-widget')).toBeNull();
    await expect(instance.open()).rejects.toThrow(/closed/);
  });
  it('does not restore a pending conversation after destroy or resave it', async () => {
    saveCaseId(sessionIdentity(token('usr_a'), 'ten_test')!, 'cas_a');
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetch);
    instance = AISupportWidget.init(config()); const pending = instance.open(); instance.destroy();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    finish(new Response(JSON.stringify({ case: { id: 'cas_a', status: 'active' }, messages: [] })));
    await pending; expect(document.getElementById('ai-support-widget')).toBeNull();
  });
  it('uses updated context and a proactively refreshed JWT on the next case request', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ case: { id: 'cas_new' }, aiMessage: { id: 'msg_a', role: 'assistant', content: 'OK', actions: [], evidence: [] } })));
    vi.stubGlobal('fetch', fetch);
    instance = AISupportWidget.init(config()); await instance.open();
    instance.updateContext({ userState: { marker: 'fresh' } }); instance.updateJwt(token('usr_a', 2));
    const shadow = document.getElementById('ai-support-widget')!.shadowRoot!;
    const input = shadow.querySelector('input')!; input.value = 'Help';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const request = fetch.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({ Authorization: `Bearer ${token('usr_a', 2)}` });
    expect(JSON.parse(request.body as string).context).toEqual({ userState: { marker: 'fresh' } });
  });
});
