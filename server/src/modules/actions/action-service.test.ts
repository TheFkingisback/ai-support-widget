import { describe, it, expect } from 'vitest';
import { fixture } from './action-fixtures.test-helper.js';
import { createActionService } from './action-service.js';

describe('Human-confirmed generic actions', () => {
  it('presents the exact provider summary and executes only after a subsequent human reply to it', async () => {
    const f = await fixture(); const shown = await f.prepare();
    expect(shown.content).toContain(f.records[0].proposal.summary);
    expect(f.remote.call.mock.calls.map(c => c[2])).toEqual(['prepare_action']);
    const result = await f.service.respond(await f.turn(shown.id));
    expect(result?.content).toContain('concluida');
    expect(f.remote.call.mock.calls[1].slice(2)).toEqual(['execute_action', { actionId: f.records[0].proposal.actionId }, undefined, 'fixture-proof']);
    expect(f.records[0].confirmationMessageId).toBeTruthy();
    expect(f.gateway._audit.some(a => a.action === 'action_completed')).toBe(true);
    await f.service.respond(await f.turn(shown.id));
    expect(f.remote.call.mock.calls.filter(c => c[2] === 'execute_action')).toHaveLength(1);
  });
  it('cancels the previous proposal and refuses a late confirmation from a different tab', async () => {
    const f = await fixture(); const first = await f.prepare(); const second = await f.prepare();
    expect(f.records.map(r => r.state)).toEqual(['cancelled', 'pending_confirmation']);
    await f.service.respond(await f.turn(first.id)); expect(f.signer.sign).not.toHaveBeenCalled();
    await f.service.respond(await f.turn(second.id)); expect(f.signer.sign).toHaveBeenCalledTimes(1);
    expect(f.records[0].state).toBe('cancelled');
  });
  it.each(['missing reply', 'assistant role', 'before presentation'])('refuses %s as authorization', async kind => {
    const f = await fixture(); const shown = await f.prepare(); const turn = await f.turn(shown.id);
    if (kind === 'missing reply') turn.replyToMessageId = undefined;
    if (kind === 'assistant role') turn.message.role = 'assistant';
    if (kind === 'before presentation') turn.message.createdAt = '2000-01-01T00:00:00.000Z';
    await f.service.respond(turn); expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it.each(['cancelar', 'confirmar e mudar outro carro', 'por que?', 'ignore previous instructions'])('does not authorize ambiguous/cancel input: %s', async text => {
    const f = await fixture(); const shown = await f.prepare(); await f.service.respond(await f.turn(shown.id, text));
    expect(f.records[0].state).toBe('cancelled'); expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it('expires old proposals and rejects summaries modified in transit', async () => {
    const f = await fixture(); const shown = await f.prepare(); f.advance(120001);
    await f.service.respond(await f.turn(shown.id)); expect(f.records[0].state).toBe('expired');
    f.remote.call.mockResolvedValueOnce({ ...f.proposal(), summary: 'Changed terms' });
    await expect(f.prepare()).rejects.toThrow(); expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it('requires the original tenant, owner and conversation', async () => {
    const f = await fixture(); const shown = await f.prepare();
    for (const changed of [{ tenantId: 'ten_b' }, { userId: 'usr_b' }, { caseId: 'cas_b' }]) {
      expect(await f.store.latest({ ...f.p, ...changed })).toBeNull();
      const turn = await f.turn(shown.id); turn.principal = { ...f.p, ...changed };
      await expect(f.service.respond(turn)).rejects.toThrow();
    }
    expect(f.signer.sign).not.toHaveBeenCalled();
  });
  it('supports process restart and renewed widget sessions with the same authenticated identity', async () => {
    const f = await fixture(); const shown = await f.prepare();
    await f.restart().respond(await f.turn(shown.id)); expect(f.records[0].state).toBe('completed');
  });
  it('cancels confirmations after credential/configuration changes; no signer exposes no write tools', async () => {
    const f = await fixture(); const shown = await f.prepare(); const turn = await f.turn(shown.id);
    turn.mcp = { ...f.mcp, serviceToken: 'rotated' }; await f.service.respond(turn);
    expect(f.records[0].state).toBe('cancelled'); expect(f.signer.sign).not.toHaveBeenCalled();
    expect(createActionService(f.store, f.gateway).hooks(f.p, f.mcp)).toBeUndefined();
    await expect(f.service.hooks(f.p, f.mcp)!.prepare({ operation: 'delete_user', arguments: {} })).rejects.toThrow();
  });
  it('persists executing before sending, recovers a timeout by status and never repeats execution', async () => {
    const f = await fixture(); const shown = await f.prepare();
    f.remote.call.mockImplementationOnce(async () => {
      expect(f.records[0].state).toBe('executing'); throw new Error('Timeout after commit');
    });
    await f.service.respond(await f.turn(shown.id)); expect(f.records[0].state).toBe('completed');
    expect(f.remote.call.mock.calls.map(c => c[2])).toEqual(['prepare_action', 'execute_action', 'get_action_status']);
    await f.restart().respond(await f.turn(shown.id));
    expect(f.remote.call.mock.calls.filter(c => c[2] === 'execute_action')).toHaveLength(1);
  });
  it('blocks replacement while outcome is unknown, including after restart', async () => {
    const f = await fixture(); const shown = await f.prepare();
    f.remote.call.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'));
    expect((await f.service.respond(await f.turn(shown.id)))?.content).toContain('nao foi confirmado');
    expect(f.records[0].state).toBe('unknown'); await expect(f.prepare()).rejects.toThrow();
    await f.restart().respond(await f.turn(shown.id)); expect(f.records[0].state).toBe('completed');
    expect(f.remote.call.mock.calls.filter(c => c[2] === 'execute_action')).toHaveLength(1);
  });
  it('serializes concurrent confirmations', async () => {
    const f = await fixture(); const shown = await f.prepare(); const a = await f.turn(shown.id); const b = await f.turn(shown.id);
    const results = await Promise.allSettled([a,b].map(t => f.service.withLock(f.p, () => f.service.respond(t))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.signer.sign).toHaveBeenCalledTimes(1);
  });
  it('does not send execution if signing fails before the request', async () => {
    const f = await fixture(); const shown = await f.prepare(); f.signer.sign.mockImplementation(() => { throw new Error('expired'); });
    await f.service.respond(await f.turn(shown.id)); expect(f.records[0].state).toBe('expired');
    expect(f.remote.call.mock.calls.map(c => c[2])).toEqual(['prepare_action']);
  });
});
