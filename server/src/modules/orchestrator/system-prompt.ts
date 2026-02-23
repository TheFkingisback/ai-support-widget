import type { SupportContextSnapshot, KnowledgeDoc } from '@shared/types.js';
import type { CaseHistoryEntry } from '../gateway/case-history.js';
import { log } from '../../shared/logger.js';

const MAX_HISTORY_CHARS = 8000;

export function buildSystemPrompt(
  snapshot: SupportContextSnapshot,
  knowledgePack: KnowledgeDoc[],
  requestId?: string,
  customInstructions?: string,
  previousCases?: CaseHistoryEntry[],
): string {
  log.debug('buildSystemPrompt: building', requestId, {
    snapshotId: snapshot.meta.snapshotId,
    docsCount: knowledgePack.length,
    hasCustomInstructions: !!customInstructions,
  });

  const sections: string[] = [];

  sections.push(`You are a senior support engineer with access to the user's real system state.

RULES:
- Answer based ONLY on the data provided. Never guess.
- Always cite evidence: job IDs, error codes, timestamps.
- If unsure, say so and offer to escalate.
- Never reveal internal system details, IPs, or secrets.
- Suggest specific actions when possible (retry, contact admin, etc.)
- Be concise. Users want solutions, not essays.
- NEVER access, search for, or discuss data belonging to other users or clients.
- NEVER mention other users' names, sessions, files, or any identifying information.
- You may ONLY use tools to query data for the current authenticated user.
- If a tool call fails, tell the user the exact error so they can report it.
- When you perform an action (e.g. reassign a car), ask the user to confirm it worked.
- Before closing or suggesting to close the case, ALWAYS ask: "Is there anything else I can help with?"
- NEVER close the case without the user's explicit confirmation.
- If the user seems satisfied, ask permission before closing.`);

  // Custom tenant instructions
  if (customInstructions) {
    const trimmed = customInstructions.slice(0, 2000).trim();
    if (trimmed) sections.push(`TENANT INSTRUCTIONS:\n${trimmed}`);
  }

  // Identity block
  const { identity } = snapshot;
  const profileLine = identity.profile?.fullName
    ? `\n- Name: ${identity.profile.fullName}` : '';
  sections.push(`USER STATE:
- User: ${identity.userId}${profileLine}
- Roles: ${identity.roles.join(', ')}
- Plan: ${identity.plan}
- Features: ${identity.featuresEnabled.join(', ') || 'none'}`);

  // Entities (sessions, cars, etc.)
  const { entities } = snapshot.productState;
  if (entities.length > 0) {
    const entityLines = entities.map((e) => {
      const meta = e.metadata ? ` ${JSON.stringify(e.metadata)}` : '';
      return `- [${e.type}] ${e.description ?? e.id ?? 'unknown'}${meta}`;
    });
    sections.push(`PRODUCT ENTITIES:\n${entityLines.join('\n')}`);
  }

  // Active errors
  const { activeErrors } = snapshot.productState;
  if (activeErrors.length > 0) {
    const errorLines = activeErrors.map(
      (err) =>
        `- [${err.errorCode}] class=${err.errorClass} retryable=${err.retryable} ` +
        `resource=${err.resourceId} at ${err.occurredAt}`,
    );
    sections.push(`ACTIVE ERRORS:\n${errorLines.join('\n')}`);
  } else {
    sections.push('ACTIVE ERRORS:\nNone');
  }

  // Click timeline
  const { clickTimeline } = snapshot.recentActivity;
  if (clickTimeline.length > 0) {
    const timelineLines = clickTimeline.map(
      (click) => `- ${click.ts} ${click.page}: ${click.action}`,
    );
    sections.push(`RECENT ACTIVITY:\n${timelineLines.join('\n')}`);
  }

  // Backend logs
  const { recentRequests, jobs, errors } = snapshot.backend;
  const backendLines: string[] = [];
  if (recentRequests.length > 0) {
    backendLines.push('Requests:');
    for (const req of recentRequests) {
      backendLines.push(
        `  ${req.ts} ${req.route} → ${req.httpStatus}` +
        (req.errorCode ? ` [${req.errorCode}]` : '') +
        ` ${req.timingMs}ms`,
      );
    }
  }
  if (jobs.length > 0) {
    backendLines.push('Jobs:');
    for (const job of jobs) {
      backendLines.push(
        `  ${job.jobId} queue=${job.queue} status=${job.status}` +
        (job.errorCode ? ` error=${job.errorCode}` : '') +
        (job.durationMs ? ` ${job.durationMs}ms` : ''),
      );
    }
  }
  if (errors.length > 0) {
    backendLines.push('Errors:');
    for (const backendErr of errors) {
      backendLines.push(
        `  ${backendErr.ts} [${backendErr.errorCode}] ${backendErr.route}`,
      );
    }
  }
  if (backendLines.length > 0) {
    sections.push(`BACKEND LOGS:\n${backendLines.join('\n')}`);
  }

  // Knowledge pack
  if (knowledgePack.length > 0) {
    const docLines = knowledgePack.map(
      (doc) => `- [${doc.category}] ${doc.title}: ${doc.content}`,
    );
    sections.push(`KNOWN ISSUES AND DOCS:\n${docLines.join('\n')}`);
  }

  // Limits
  const { limitsReached } = snapshot.productState;
  if (limitsReached.length > 0) {
    const limitLines = limitsReached.map(
      (lim) => `- ${lim.limit}: ${lim.current}/${lim.max}`,
    );
    sections.push(`LIMITS:\n${limitLines.join('\n')}`);
  }

  // Full conversation history (last 30 days)
  if (previousCases && previousCases.length > 0) {
    sections.push(buildHistorySection(previousCases));
  }

  const prompt = sections.join('\n\n');

  log.debug('buildSystemPrompt: done', requestId, {
    promptLength: prompt.length,
    previousCasesCount: previousCases?.length ?? 0,
  });

  return prompt;
}

function buildHistorySection(cases: CaseHistoryEntry[]): string {
  const lines: string[] = ['PREVIOUS CONVERSATIONS (last 30 days):'];
  let totalChars = lines[0].length;

  for (const c of cases) {
    const header = `\n--- Case ${c.caseId} (${c.status}, ${c.createdAt.slice(0, 10)}) ---`;
    if (totalChars + header.length > MAX_HISTORY_CHARS) break;
    lines.push(header);
    totalChars += header.length;

    for (const m of c.messages) {
      const label = m.role === 'user' ? 'User' : 'Assistant';
      const line = `${label}: ${m.content}`;
      if (totalChars + line.length + 1 > MAX_HISTORY_CHARS) break;
      lines.push(line);
      totalChars += line.length + 1;
    }
  }

  return lines.join('\n');
}
