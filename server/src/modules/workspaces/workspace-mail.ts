import { AppError } from '../../shared/errors.js';
import { messagesFor } from '@ai-support/shared/messages';
import type { SupportLocale } from '@ai-support/shared/locales';

export interface WorkspaceMail {
  send(email: string, url: string, locale?: SupportLocale, invitation?: boolean): Promise<void>;
}

export function createWorkspaceMail(apiKey: string, from: string): WorkspaceMail {
  return {
    async send(email, url, locale, invitation) {
      const copy = messagesFor(locale);
      const reply = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'X-Postmark-Server-Token': apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ From: `Support AI <${from}>`, To: email,
          Subject: invitation ? copy.inviteSubject : copy.accessSubject,
          TextBody: `${invitation ? copy.inviteBody : copy.accessBody}\n\n${url}`,
          TrackOpens: false, TrackLinks: 'None', MessageStream: 'outbound' }),
        signal: AbortSignal.timeout(10_000),
      });
      await reply.body?.cancel();
      if (!reply.ok) throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'The sign-in email could not be sent. Try again shortly.');
    },
  };
}
