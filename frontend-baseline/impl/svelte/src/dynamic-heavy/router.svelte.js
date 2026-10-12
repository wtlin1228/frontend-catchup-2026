// Plain Svelte has no router: this is the baseline's hash router re-expressed as a rune, in forty lines.
// `route` is module-level state every view reads; `navigate` and `href` build the URLs; the hash is the source of truth.
const ROUTES = [
  { name: 'list', path: '/' },
  { name: 'post', path: '/posts/:id' },
  { name: 'new', path: '/new' },
].map((r) => {
  const keys = [];
  const pattern = r.path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { ...r, keys, re: new RegExp(`^${pattern}/?$`) };
});

export const route = $state({ name: 'list', params: {}, query: new URLSearchParams(), path: '/' });
export let lastList = $state({ href: '#/' }); // "Back to all posts" restores the list's search and page

function parse() {
  const url = new URL(location.hash.replace(/^#/, '') || '/', 'http://local');
  return { path: url.pathname, query: url.searchParams };
}
function update() {
  const { path, query } = parse();
  const found = ROUTES.map((r) => ({ r, m: path.match(r.re) })).find((x) => x.m);
  Object.assign(route, { path, query, name: found ? found.r.name : 'missing', params: found ? Object.fromEntries(found.r.keys.map((k, i) => [k, decodeURIComponent(found.m[i + 1])])) : {} });
  window.scrollTo({ top: 0 });
}
export function href(path, query) {
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString() : '';
  return `#${path}${qs ? `?${qs}` : ''}`;
}
export function navigate(path, query, { replace = false } = {}) {
  const target = href(path, query);
  if (replace) { history.replaceState(null, '', target); update(); } else location.hash = target;
}
export function announce(title) {
  document.title = `${title} · Posts · Frontend Baseline, Svelte port`;
  const announcer = document.getElementById('route-announcer');
  if (announcer) announcer.textContent = `Navigated to ${document.title}`;
}
window.addEventListener('hashchange', update);
update();
