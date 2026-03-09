import type { SuggestedAction, Evidence, SupportContextSnapshot } from '@shared/types.js';
import { log } from '../../shared/logger.js';

export interface ParsedResponse {
  content: string;
  actions: SuggestedAction[];
  evidence: Evidence[];
  confidence: number | null;
}

const ACTION_PATTERNS: Array<{
  regex: RegExp;
  type: SuggestedAction['type'];
  labelPrefix: string;
}> = [
  { regex: /\bretry\b/i, type: 'retry', labelPrefix: 'Retry' },
  { regex: /\bdocumentation\b|\bdocs\b|\bguide\b/i, type: 'open_docs', labelPrefix: 'View docs' },
  { regex: /\bcreate\s+(?:a\s+)?ticket\b|\bsubmit\s+(?:a\s+)?ticket\b|\bopen\s+(?:a\s+)?ticket\b/i, type: 'create_ticket', labelPrefix: 'Create ticket' },
  { regex: /\brequest\s+access\b|\bcontact\s+(?:your\s+)?admin\b/i, type: 'request_access', labelPrefix: 'Request access' },
];

const EVIDENCE_PATTERNS: Array<{
  regex: RegExp;
  type: Evidence['type'];
}> = [
  { regex: /\b([A-Z][A-Z0-9_]{2,}(?:_[A-Z0-9]+)+)\b/g, type: 'error_code' },
  { regex: /\bjob[_\s]?([\w-]+)\b/gi, type: 'job_id' },
  { regex: /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\b/g, type: 'timestamp' },
  { regex: /\b(?:res|file|proj|upload)_([a-zA-Z0-9_]+)\b/g, type: 'resource_id' },
];

const CONFIDENCE_HIGH = [
  /\bI(?:'m| am) (?:certain|confident|sure)\b/i,
  /\bclearly\b/i,
  /\bdefinitely\b/i,
  /\bthe root cause is\b/i,
  /\bthis is caused by\b/i,
];

const CONFIDENCE_LOW = [
  /\bmight be\b/i,
  /\bcould be\b/i,
  /\bpossibly\b/i,
  /\bnot sure\b/i,
  /\bI(?:'m| am) unsure\b/i,
  /\bit.s unclear\b/i,
];

function estimateConfidence(text: string): number | null {
  for (const re of CONFIDENCE_HIGH) {
    if (re.test(text)) return 0.9;
  }
  for (const re of CONFIDENCE_LOW) {
    if (re.test(text)) return 0.5;
  }
  return 0.7;
}

function extractActions(text: string): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const seen = new Set<string>();

  for (const pattern of ACTION_PATTERNS) {
    if (pattern.regex.test(text) && !seen.has(pattern.type)) {
      seen.add(pattern.type);
      actions.push({
        type: pattern.type,
        label: pattern.labelPrefix,
        payload: {},
      });
    }
  }

  return actions;
}

/** Build a set of valid evidence values from the snapshot */
function buildSnapshotAllowlist(snapshot: SupportContextSnapshot): Set<string> {
  const allowed = new Set<string>();

  for (const err of snapshot.productState.activeErrors) {
    allowed.add(`error_code:${err.errorCode}`);
    allowed.add(`resource_id:${err.resourceId}`);
    allowed.add(`timestamp:${err.occurredAt}`);
  }

  for (const err of snapshot.backend.errors) {
    allowed.add(`error_code:${err.errorCode}`);
    if (err.resourceId) allowed.add(`resource_id:${err.resourceId}`);
    allowed.add(`timestamp:${err.ts}`);
  }

  for (const job of snapshot.backend.jobs) {
    allowed.add(`job_id:${job.jobId}`);
    if (job.errorCode) allowed.add(`error_code:${job.errorCode}`);
    allowed.add(`timestamp:${job.createdAt}`);
    allowed.add(`timestamp:${job.updatedAt}`);
  }

  for (const req of snapshot.backend.recentRequests) {
    if (req.errorCode) allowed.add(`error_code:${req.errorCode}`);
    if (req.resourceId) allowed.add(`resource_id:${req.resourceId}`);
    allowed.add(`timestamp:${req.ts}`);
  }

  for (const evt of snapshot.recentActivity.events) {
    allowed.add(`timestamp:${evt.ts}`);
  }

  return allowed;
}

function extractEvidence(text: string, allowlist?: Set<string>): Evidence[] {
  const evidence: Evidence[] = [];
  const seen = new Set<string>();

  for (const pattern of EVIDENCE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[1] ?? match[0];
      const key = `${pattern.type}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (allowlist && !allowlist.has(key)) continue;
      evidence.push({ type: pattern.type, label: pattern.type, value });
    }
  }

  return evidence;
}

export function parseAIResponse(
  raw: string,
  requestId?: string,
  snapshot?: SupportContextSnapshot | null,
): ParsedResponse {
  log.debug('parseAIResponse: parsing', requestId, { rawLength: raw.length });

  const actions = extractActions(raw);
  const allowlist = snapshot ? buildSnapshotAllowlist(snapshot) : undefined;
  const evidence = extractEvidence(raw, allowlist);
  const confidence = estimateConfidence(raw);

  log.debug('parseAIResponse: done', requestId, {
    actionsCount: actions.length,
    evidenceCount: evidence.length,
    confidence,
  });

  return { content: raw, actions, evidence, confidence };
}
