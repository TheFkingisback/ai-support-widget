import { issueSupportSession } from './backend-session.mjs';

/** Mount on your app server. The two callbacks must use your application's authenticated data. */
export function createBootstrapHandler({ authenticate, collectContext, issueSession = issueSupportSession }) {
  const headers = { 'Cache-Control': 'no-store' };
  return async request => {
    const user = await authenticate(request);
    if (!user?.userId) return Response.json({ error: 'SIGN_IN_REQUIRED' }, { status: 401, headers });
    try {
      const session = await issueSession({ userId: user.userId, userRoles: user.roles ?? [], plan: user.plan ?? 'standard' }, request.signal);
      const context = await collectContext(user, session.tenantKey, request.signal);
      if (context?.userState?.userId !== user.userId || context?.userState?.tenantId !== session.tenantKey) {
        return Response.json({ error: 'CONTEXT_IDENTITY_MISMATCH' }, { status: 403, headers });
      }
      const locale = typeof user.locale === 'string' && user.locale.length <= 100 ? user.locale : undefined;
      return Response.json({ ...session, context, ...(locale ? { locale } : {}) }, { headers });
    } catch {
      return Response.json({ error: 'SUPPORT_BOOTSTRAP_UNAVAILABLE' }, { status: 503, headers });
    }
  };
}
