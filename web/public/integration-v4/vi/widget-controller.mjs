let sdkPromise;

/** Tải SDK cục bộ được ghim một lần. Máy chủ không bao giờ được tải phiên bản SDK thứ hai. */
export function loadSdk(src = '/vendor/ai-support/widget.v0.3.0.js') {
  if (sdkPromise) return sdkPromise;
  if (window.AISupportWidget) return Promise.reject(new Error("SDK không mong muốn đã được tải"));
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => fail(), 10000);
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); script.remove(); sdkPromise = undefined;
      reject(new Error("Hỗ trợ SDK không khả dụng"));
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

/** Gắn sau khi khởi động được xác thực; hủy ngay lập tức khi đăng xuất, thay đổi vai trò hoặc người bán. */
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
          if (disposed || next.tenantKey !== data.tenantKey) throw new Error("Phiên hỗ trợ đã thay đổi");
          return next.jwt;
        },
        onOpen: async () => {
          const context = await getContext(abort.signal);
          if (disposed) throw new Error("Hỗ trợ đã bị hủy");
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
