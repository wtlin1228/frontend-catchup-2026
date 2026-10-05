import './offline-heavy.css';
import { h } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const log = (message) => $('log').prepend(h('li', null, `${new Date().toLocaleTimeString()} ${message}`));

const paintConnection = () => { $('conn').textContent = navigator.onLine ? 'online' : 'offline'; };
window.addEventListener('online', () => { paintConnection(); log('Back online'); });
window.addEventListener('offline', () => { paintConnection(); log('Offline'); });
paintConnection();

async function main() {
  if (!('serviceWorker' in navigator)) {
    $('sw-status').textContent = 'not supported here';
    return;
  }
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/offline/' });
  const describe = () => {
    $('sw-status').textContent = registration.waiting ? 'update waiting' : registration.installing ? 'installing' : navigator.serviceWorker.controller ? 'active and controlling this page' : 'active, will control the next load';
  };
  describe();
  log(`Registered with scope ${registration.scope}`);
  // Update flow: a new worker installs, waits, and only takes over when the person accepts.
  const watch = (worker) => worker?.addEventListener('statechange', () => { describe(); if (worker.state === 'installed' && navigator.serviceWorker.controller) { $('update').hidden = false; log('Update installed and waiting'); } });
  watch(registration.installing);
  registration.addEventListener('updatefound', () => { log('New worker found'); watch(registration.installing); });
  if (registration.waiting) $('update').hidden = false;
  $('update').addEventListener('click', () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }));
  $('check-update').addEventListener('click', async () => { await registration.update(); log('Checked for updates'); });
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}
main().catch((err) => { $('sw-status').textContent = `failed: ${err.message}`; });

$('fetch-posts').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/posts?limit=3');
    const { items } = await res.json();
    $('fetch-result').textContent = `${items.map((p) => p.title).join('; ')} (served by ${res.headers.get('x-served-by') ?? 'the network'})`;
  } catch {
    $('fetch-result').textContent = 'Fetch failed and nothing was cached yet.';
  }
});
$('list-cache').addEventListener('click', async () => {
  const names = await caches.keys();
  const entries = [];
  for (const name of names) for (const req of await (await caches.open(name)).keys()) entries.push(new URL(req.url).pathname);
  $('cache-list').replaceChildren(...entries.map((p) => h('li', null, p)));
  log(`${entries.length} cached entries in ${names.length} cache${names.length === 1 ? '' : 's'}`);
});
$('clear-cache').addEventListener('click', async () => {
  for (const name of await caches.keys()) await caches.delete(name);
  $('cache-list').replaceChildren();
  log('Caches cleared');
});
