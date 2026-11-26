let sdkPromise;

/** 固定されたローカルSDKを一度だけ読み込みます。ホストは2つ目のSDKバージョンを読み込んではいけません。 */
export function loadSdk(src = '/vendor/ai-support/widget.v0.3.0.js') {
  if (sdkPromise) return sdkPromise;
  if (window.AISupportWidget) return Promise.reject(new Error("予期しないSDKが既に読み込まれています"));
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => fail(), 10000);
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); script.remove(); sdkPromise = undefined;
      reject(new Error("サポートSDKが利用できません"));
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

/** 認証されたブートストラップ後にマウントし、ログアウト、ロールまたはマーチャントの変更時に直ちに破棄します。 */
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
          if (disposed || next.tenantKey !== data.tenantKey) throw new Error("サポートセッションが変更されました");
          return next.jwt;
        },
        onOpen: async () => {
          const context = await getContext(abort.signal);
          if (disposed) throw new Error("サポートが破棄されました");
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
