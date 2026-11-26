import { describe, expect, it } from 'vitest';
import { safeText } from '../../modules/context/safe-content.js';
import { errorCode } from '../../shared/logger.js';

describe('Credential and driver diagnostic privacy', () => {
  it('removes standalone integration and administrative credentials from free text', () => {
    const integration = 'sik_' + 'a'.repeat(32) + '.' + 'B'.repeat(43);
    const admin = 'tsk_' + 'C'.repeat(32);
    const safe = safeText(`Before ${integration} and ${admin} after`);
    expect(safe).toContain('Before'); expect(safe).not.toContain('sik_'); expect(safe).not.toContain('tsk_');
    expect(safe).not.toContain('B'.repeat(12)); expect(safe).not.toContain('C'.repeat(12));
  });
  it('reports database failures without including SQL parameters or messages', () => {
    const failure = Object.assign(new Error('Customer input in driver error'), { query: 'insert ...', params: ['sensitive example'] });
    expect(errorCode(failure)).toBe('DATABASE_QUERY_FAILED');
    expect(errorCode(new Error('sensitive example'))).toBe('OPERATION_FAILED');
  });
});
