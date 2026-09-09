const PREFIX = 'ai_support_';

function key(identity: string): string {
  return `${PREFIX}v2_${encodeURIComponent(identity)}_caseId`;
}

export function saveCaseId(tenantKey: string, caseId: string): void {
  try {
    localStorage.setItem(key(tenantKey), caseId);
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
}

export function loadCaseId(tenantKey: string): string | null {
  try {
    return localStorage.getItem(key(tenantKey));
  } catch {
    return null;
  }
}

export function clearCaseId(tenantKey: string): void {
  try {
    localStorage.removeItem(key(tenantKey));
  } catch {
    // ignore
  }
}
