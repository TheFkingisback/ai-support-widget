import { describe, expect, it } from 'vitest';
import { fixture } from './action-fixtures.test-helper.js';
describe('Native MCP action confirmation', () => {
  it('presents exact arguments, claims the confirmation and dispatches once', async () => {
    const f = await fixture(); const shown = await f.prepare();
    expect(shown.content).toContain('example-id'); expect(f.dispatch).not.toHaveBeenCalled();
    await f.confirm('wrong-message'); expect(f.dispatch).not.toHaveBeenCalled();
    await f.confirm(shown.id); await f.confirm(shown.id);
    expect(f.dispatch).toHaveBeenCalledExactlyOnceWith(f.tool, f.p, { recurrence: 'example-id' }, f.records[0].id);
    expect(f.records[0].state).toBe('completed');
  });
  it('rejects renewed sessions, switched endpoints and changed schemas', async () => {
    for (const change of ['session','url','schema']) {
      const f = await fixture(); const shown = await f.prepare();
      const tool = structuredClone(f.tool);
      if (change === 'url') tool.server.url = 'https://another.example/mcp';
      if (change === 'schema') tool.signature = 'schema2';
      await f.confirm(shown.id, { ...f.p, sid: change === 'session' ? 'new' : f.p.sid }, [tool]);
      expect(f.dispatch).not.toHaveBeenCalled(); expect(f.records[0].state).toBe('conflict');
    }
  });
  it('never resends an uncertain action and blocks another proposal', async () => {
    const f = await fixture(); const shown = await f.prepare(); f.dispatch.mockRejectedValueOnce(new Error());
    await f.confirm(shown.id); await f.confirm(shown.id);
    expect(f.records[0].state).toBe('unknown'); await expect(f.prepare()).rejects.toThrow();
    expect(f.dispatch).toHaveBeenCalledTimes(1);
  });
  it('rejects expired or superseded proposals', async () => {
    const f = await fixture(); const first = await f.prepare(); await f.prepare(); await f.confirm(first.id);
    expect(f.dispatch).not.toHaveBeenCalled();
    f.records[1].proposal.expiresAt = new Date(0).toISOString();
    await f.confirm(f.records[1].presentedMessageId!); expect(f.records[1].state).toBe('expired');
  });
});
