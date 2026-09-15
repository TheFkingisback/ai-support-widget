let sdkPromise;

/** Load the pinned local SDK once. The host must never load a second SDK version. */
export function loadSdk(src = '/vendor/ai-support/widget.v0.2.1.js') {
  if (sdkPromise) return sdkPromise;
  if (window.AISupportWidget) return Promise.reject(new Error('Unexpected SDK already loaded'));
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => fail(), 10000);
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); script.remove(); sdkPromise = undefined;
      reject(new Error('Support SDK unavailable'));
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

/** Mount after authenticated bootstrap; destroy immediately on logout, role or merchant change. */
export function mountSupport({ apiUrl, bootstrap, getContext, onUnavailable, ensureSdk = loadSdk }) {
  const abort = new AbortController();
  let instance;
  let disposed = false;
  const ready = (async () => {
    try {
      const [data] = await Promise.all([bootstrap(abort.signal), ensureSdk()]);
      if (disposed) return;
      instance = window.AISupportWidget.init({
        apiUrl, tenantKey: data.tenantKey, jwt: data.jwt, context: data.context,
        locale: 'pt-BR', theme: 'light', position: 'bottom-right', brandColor: '#0f766e',
        onTokenRefresh: async () => {
          const next = await bootstrap(abort.signal);
          if (disposed || next.tenantKey !== data.tenantKey) throw new Error('Support session changed');
          return next.jwt;
        },
        onOpen: async () => {
          const context = await getContext(abort.signal);
          if (disposed) throw new Error('Support disposed');
          instance?.updateContext(context);
        },
      });
    } catch {
      if (!disposed) onUnavailable();
    }
  })();
  return {
    ready,
    destroy() { disposed = true; abort.abort(); instance?.destroy(); instance = undefined; },
  };
}
