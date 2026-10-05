// Client-side routing. Hash-based so it works on any static host without a catch-all rule;
// frameworks use the History API plus a server/CDN rewrite. Each navigation gets an AbortController
// (in-flight fetches of the previous view are cancelled) and a cleanup list (listeners, timers).

export function createRouter(routes, { root, announce } = {}) {
  let controller = null;
  let cleanups = [];
  const fallback = routes.find((r) => r.path === '*');
  const compiled = routes
    .filter((r) => r.path !== '*')
    .map((r) => {
      const keys = [];
      const pattern = r.path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
      return { ...r, keys, re: new RegExp(`^${pattern}/?$`) };
    });

  function parse() {
    const url = new URL(location.hash.replace(/^#/, '') || '/', 'http://local');
    return { path: url.pathname, query: url.searchParams };
  }
  function match(path) {
    for (const route of compiled) {
      const m = path.match(route.re);
      if (m) return { route, params: Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
    }
    return { route: fallback, params: {} };
  }
  function href(path, query) {
    const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString() : '';
    return `#${path}${qs ? `?${qs}` : ''}`;
  }
  function navigate(path, query, { replace = false } = {}) {
    const target = href(path, query);
    if (replace) history.replaceState(null, '', target); // no hashchange event: caller re-renders what it needs
    else location.hash = target;
  }
  async function run() {
    controller?.abort();
    controller = new AbortController();
    for (const fn of cleanups.splice(0)) fn();
    const { path, query } = parse();
    const { route, params } = match(path);
    const ctx = { path, params, query, signal: controller.signal, root, navigate, href, refresh: run, onCleanup: (fn) => cleanups.push(fn) };
    window.scrollTo({ top: 0 });
    try {
      const result = await route.view(ctx);
      if (typeof result === 'function') cleanups.push(result);
      if (!ctx.signal.aborted) announce?.(document.title);
    } catch (err) {
      if (err?.name !== 'AbortError') throw err;
    }
  }

  window.addEventListener('hashchange', run);
  return {
    start: run,
    navigate,
    href,
    current: parse,
    stop() {
      window.removeEventListener('hashchange', run);
      controller?.abort();
      for (const fn of cleanups.splice(0)) fn();
    },
  };
}
