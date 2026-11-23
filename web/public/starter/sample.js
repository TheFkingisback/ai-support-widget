(() => {
  const tenantId = 'ten_local_sample';
  const userId = 'usr_local_sample';
  const apiUrl = `${window.location.origin}/local-fixture`;
  const encode = value => btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  const jwt = `${encode({ alg: 'none' })}.${encode({ tenantId, userId, sub: userId })}.fixture`;
  const status = document.getElementById('status');
  const preferred = new URLSearchParams(window.location.search).get('lang') || navigator.language || 'en-US';
  const locale = window.AISupportWidget?.localization?.(preferred);
  const copy = locale?.messages ?? {};
  if (locale) {
    document.documentElement.lang = locale.locale;
    document.documentElement.dir = locale.dir;
    document.querySelectorAll('[data-copy]').forEach(element => {
      if (copy[element.dataset.copy]) element.textContent = copy[element.dataset.copy];
    });
  }
  const context = {
    userState: { tenantId, userId, roles: ['member'], plan: 'standard', featuresEnabled: [], entities: [], activeErrors: [], limitsReached: [] },
    userHistory: { windowHours: 24, events: [] },
    userLogs: { recentRequests: [], jobs: [], errors: [] },
  };
  const time = '2026-01-12T14:08:00Z';
  const caseData = { id: 'cas_sample', tenantId, userId, status: 'active', snapshotId: 'scs_sample', createdAt: time, updatedAt: time, resolvedAt: null, messageCount: 2, feedback: null };
  const reply = { id: 'msg_sample', caseId: caseData.id, role: 'assistant', content: copy.sampleAnswer ?? 'The import stopped at row 42 of customers.csv. The email column is empty on that row. Add the missing email, then upload the CSV again.', actions: [], evidence: [{ type: 'job_id', label: copy.sampleImport ?? 'Import', value: 'import_1042' }, { type: 'error_code', label: copy.sampleError ?? 'Error', value: 'INVALID_EMAIL' }, { type: 'timestamp', label: copy.sampleTime ?? 'Failed at', value: time }], confidence: null, createdAt: time };
  let messages = [];
  const originalFetch = window.fetch.bind(window);
  // This sample runs in its own window. Only its synthetic requests are intercepted.
  window.fetch = async (resource, options) => {
    const url = new URL(typeof resource === 'string' ? resource : resource.url, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/local-fixture/api/')) return originalFetch(resource, options);
    if (url.pathname === '/local-fixture/api/cases' || url.pathname.endsWith('/messages')) {
      const body = JSON.parse(options.body);
      messages = [...messages, { ...reply, id: `msg_local_${messages.length}`, role: 'user', content: body.message ?? body.content, evidence: [] }, reply];
      return Response.json(url.pathname.endsWith('/messages') ? { message: reply } : { case: caseData, snapshot: { id: caseData.snapshotId }, aiMessage: reply });
    }
    if (url.pathname.endsWith('/cas_sample')) return Response.json({ case: caseData, messages });
    if (url.pathname.endsWith('/suggestions')) return Response.json({ id: 'idea_sample' }, { status: 201 });
    return Response.json({ ok: true });
  };
  let widget;
  function mount() {
    if (typeof window.AISupportWidget?.init !== 'function') {
      status.textContent = 'The widget script could not load. Check the SDK URL and reload the page.';
      return;
    }
    widget = window.AISupportWidget.init({ apiUrl, tenantKey: tenantId, jwt, context, theme: 'light', locale: locale?.locale });
    document.getElementById('open').disabled = false;
    document.getElementById('reset').disabled = false;
  }
  document.getElementById('open').addEventListener('click', () => { void widget?.open(); });
  document.getElementById('reset').addEventListener('click', () => {
    widget?.destroy();
    messages = [];
    mount();
    if (widget) status.textContent = copy.sampleResetDone ?? 'Sample reset.';
  });
  mount();
})();
