import type { SupportContextSnapshot, KnowledgeDoc } from '@shared/types.js';
import { log } from '../../shared/logger.js';

export function buildSystemPrompt(
  snapshot: SupportContextSnapshot,
  knowledgePack: KnowledgeDoc[],
  requestId?: string,
): string {
  log.debug('buildSystemPrompt: building', requestId, {
    snapshotId: snapshot.meta.snapshotId,
    docsCount: knowledgePack.length,
  });

  const sections: string[] = [];

  sections.push(`You are a senior support engineer with access to the user's real system state.

RULES:
- Answer based ONLY on the data provided. Never guess.
- Always cite evidence: job IDs, error codes, timestamps.
- If unsure, say so and offer to escalate.
- Never reveal internal system details, IPs, or secrets.
- Suggest specific actions when possible (retry, contact admin, etc.)
- Be concise. Users want solutions, not essays.`);

  // Identity block
  const { identity } = snapshot;
  sections.push(`USER STATE:
- User: ${identity.userId}
- Roles: ${identity.roles.join(', ')}
- Plan: ${identity.plan}
- Features: ${identity.featuresEnabled.join(', ') || 'none'}`);

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

  const prompt = sections.join('\n\n');

  log.debug('buildSystemPrompt: done', requestId, {
    promptLength: prompt.length,
  });

  return prompt;
}
