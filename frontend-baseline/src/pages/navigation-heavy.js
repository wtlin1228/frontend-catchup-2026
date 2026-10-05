import './common-2.css';
import { h, mount } from '../lib/dom.js';
import { getJSON } from '../lib/api.js';

const $ = (id) => document.getElementById(id);
const BASE = '/navigation/app';
const app = $('app');
const link = (path, text) => h('a', { href: `${BASE}${path}` }, text);

const routes = [
  { path: '/', title: 'Home', async view(_, signal) {
    const { items } = await getJSON('/api/posts?limit=6', { signal });
    return h('ul', { class: 'stack' }, items.map((p) => h('li', null, link(`/posts/${p.id}`, p.title))));
  } },
  { path: '/posts/:id', title: 'Post', async view({ id }, signal) {
    const post = await getJSON(`/api/posts/${id}`, { signal });
    return h('article', { class: 'stack' }, h('p', null, link('/', 'All posts')), h('h2', null, post.title), ...post.body.split('\n\n').map((t) => h('p', null, t)));
  } },
  { path: '/about', title: 'About', view: () => h('p', null, 'Every link here is a plain anchor with a real URL. Script intercepts the navigation when it can and lets the browser do it when it cannot.') },
].map((r) => ({
  ...r,
  pattern: 'URLPattern' in window ? new URLPattern({ pathname: `${BASE}${r.path}` }) : null,
  re: new RegExp(`^${BASE}${r.path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}/?$`),
}));

function match(url) {
  for (const route of routes) {
    if (route.pattern) { const m = route.pattern.exec(url); if (m) return { route, params: m.pathname.groups }; }
    else { const m = url.pathname.match(route.re); if (m) return { route, params: m.groups ?? {} }; }
  }
  return null;
}

async function render(url, signal) {
  const found = match(url);
  if (!found) return mount(app, h('p', { class: 'notice notice--warning' }, `No route for ${url.pathname}. `, link('/', 'Go home')));
  mount(app, h('p', { class: 'skeleton', style: { height: '6rem' } }, ' '));
  try {
    const view = await found.route.view(found.params, signal);
    if (signal?.aborted) return;
    mount(app, view);
    document.title = `${found.route.title} · Navigation · Frontend Baseline`;
  } catch (err) {
    if (err?.name !== 'AbortError') mount(app, h('p', { class: 'notice notice--error' }, `Could not load: ${err.message}`));
  }
  paintEntries();
}

function paintEntries() {
  if (!('navigation' in window)) return;
  const current = navigation.currentEntry;
  mount($('entries'), navigation.entries().map((e) => h('li', { class: e.key === current?.key ? 'ok' : '' }, `${e.index}: ${new URL(e.url).pathname}${e.key === current?.key ? ' (current)' : ''}`)));
  $('back').disabled = !navigation.canGoBack;
  $('forward').disabled = !navigation.canGoForward;
}

if (location.pathname.endsWith('/navigation/heavy.html')) history.replaceState(null, '', `${BASE}/`);

if ('navigation' in window) {
  $('support').textContent = 'Navigation API active: links under /navigation/app are intercepted.';
  navigation.addEventListener('navigate', (event) => {
    if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) return;
    const url = new URL(event.destination.url);
    if (!url.pathname.startsWith(BASE)) return; // anything else is a normal page load
    event.intercept({
      scroll: 'after-transition',
      focusReset: 'after-transition',
      handler: () => (document.startViewTransition ? document.startViewTransition(() => render(url, event.signal)).updateCallbackDone : render(url, event.signal)),
    });
  });
  navigation.addEventListener('currententrychange', paintEntries);
  $('back').addEventListener('click', () => navigation.back());
  $('forward').addEventListener('click', () => navigation.forward());
} else {
  $('support').textContent = 'Navigation API not available here: links do full page loads and the server serves this shell for each URL.';
  $('back').addEventListener('click', () => history.back());
  $('forward').addEventListener('click', () => history.forward());
}
render(new URL(location.href));
