export function getActiveStoreSlug(): string {
  const path = window.location.pathname;
  const match = path.match(/^\/loja\/([^/]+)/);
  if (match) {
    return match[1];
  }
  return localStorage.getItem('active_store_slug') || 'principal';
}

export function setupFetchOverride() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  const newFetch = function (this: any, input: RequestInfo | URL, init?: RequestInit) {
    const slug = getActiveStoreSlug();
    if (slug) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      headers.set('X-Store-Slug', slug);
      init.headers = headers;
    }
    return originalFetch.call(this || window, input, init);
  };

  try {
    // Attempt direct assignment
    (window as any).fetch = newFetch;
  } catch (e) {
    try {
      // Attempt Object.defineProperty on window
      Object.defineProperty(window, 'fetch', {
        value: newFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (e2) {
      try {
        // Attempt Object.defineProperty on Window.prototype
        Object.defineProperty(Window.prototype, 'fetch', {
          value: newFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e3) {
        console.warn("Could not override window.fetch safely:", e3);
      }
    }
  }
}
