import { AppError } from '../../shared/errors.js';

export interface WorkspaceMail {
  send(email: string, url: string): Promise<void>;
}

export function createWorkspaceMail(apiKey: string, from: string): WorkspaceMail {
  return {
    async send(email, url) {
      const reply = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'X-Postmark-Server-Token': apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ From: from, To: email, Subject: 'Sign in to AI Support Widget',
          TextBody: `Open this one-time link to sign in and verify your email. It expires in 20 minutes.\n\n${url}`,
          TrackOpens: false, TrackLinks: 'None', MessageStream: 'outbound' }),
        signal: AbortSignal.timeout(10_000),
      });
      await reply.body?.cancel();
      if (!reply.ok) throw new AppError(503, 'WORKSPACE_MAIL_UNAVAILABLE', 'The sign-in email could not be sent. Try again shortly.');
    },
  };
}
