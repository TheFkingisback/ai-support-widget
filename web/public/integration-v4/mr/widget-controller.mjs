let sdkPromise;

/** पिन केलेले स्थानिक SDK एकदा लोड करा. होस्टने कधीही दुसरी SDK आवृत्ती लोड करू नये. */
export function loadSdk(src = '/vendor/ai-support/widget.v0.3.0.js') {
  if (sdkPromise) return sdkPromise;
  if (window.AISupportWidget) return Promise.reject(new Error("अनपेक्षित SDK आधीच लोड झाले आहे"));
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => fail(), 10000);
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); script.remove(); sdkPromise = undefined;
      reject(new Error("सपोर्ट SDK अनुपलब्ध"));
    };
    script.src = src; script.async = true;
    script.onload = () => {
      if (settled) return;
      clearTimeout(timer);
      if (window.AISupportWidget) { settled = true; resolve(); } else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return sdkPromise;
}

/** प्रमाणीकृत बूटस्ट्रॅप नंतर माउंट करा; लॉगआउट, भूमिका किंवा व्यापारी बदलल्यावर त्वरित नष्ट करा. */
export function mountSupport({ apiUrl, bootstrap, getContext, onUnavailable, ensureSdk = loadSdk }) {
  const abort = new AbortController();
  let instance;
  let disposed = false;
  const at = (stage, work) => Promise.resolve().then(work).catch(() => {
    throw { stage, code: stage === 'sdk' ? 'SUPPORT_SDK_UNAVAILABLE' : 'SUPPORT_BOOTSTRAP_UNAVAILABLE' };
  });
  const outcome = (async () => {
    try {
      const [data] = await Promise.all([at('bootstrap', () => bootstrap(abort.signal)), at('sdk', ensureSdk)]);
      if (disposed) return { status: 'cancelled' };
      instance = window.AISupportWidget.init({
        apiUrl, tenantKey: data.tenantKey, jwt: data.jwt, context: data.context,
        locale: data.locale, theme: 'light', position: 'bottom-right', brandColor: '#0f766e',
        onTokenRefresh: async () => {
          const next = await bootstrap(abort.signal);
          if (disposed || next.tenantKey !== data.tenantKey) throw new Error("सपोर्ट सत्र बदलले");
          return next.jwt;
        },
        onOpen: async () => {
          const context = await getContext(abort.signal);
          if (disposed) throw new Error("सपोर्ट रद्द केला");
          instance?.updateContext(context);
        },
      });
      return { status: 'mounted' };
    } catch (failure) {
      if (disposed) return { status: 'cancelled' };
      const error = failure?.code ? failure : { stage: 'mount', code: 'SUPPORT_MOUNT_FAILED' };
      onUnavailable?.(error);
      return { status: 'failed', ...error };
    }
  })();
  return {
    ready: outcome.then(() => undefined),
    outcome,
    destroy() { disposed = true; abort.abort(); instance?.destroy(); instance = undefined; },
  };
}
