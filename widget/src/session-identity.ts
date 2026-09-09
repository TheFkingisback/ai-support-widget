/** Decoded claims partition browser state only. The gateway verifies authorization. */
export function sessionIdentity(token: string, tenantId: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')), c => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (claims.tenantId !== tenantId || typeof claims.userId !== 'string' || !claims.userId) return null;
    return JSON.stringify([tenantId, claims.userId]);
  } catch { return null; }
}
