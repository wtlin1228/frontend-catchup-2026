import './common-2.css';
import { h } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);
let sent = 0;
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));

async function report(kind, err) {
  const payload = { kind, message: String(err?.message ?? err), stack: err?.stack?.split('\n').slice(0, 3).join('\n'), url: location.href };
  log(`${kind}: ${payload.message}`, 'err');
  toast(`${kind}: ${payload.message}`, { type: 'error' });
  // Beacon: queued by the browser, survives the page unloading.
  const queued = navigator.sendBeacon('/api/errors', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  if (queued) $('count').textContent = ++sent;
  const res = await fetch('/api/errors', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, kind: 'count-check' }) }).catch(() => null);
  if (res) $('server').textContent = (await res.json()).received;
}
window.addEventListener('error', (e) => report('error', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => report('unhandledrejection', e.reason));

$('throw').addEventListener('click', () => setTimeout(() => { throw new Error('Thrown inside a timer callback'); }));
$('reject').addEventListener('click', () => { Promise.reject(new Error('A promise nobody awaited')); });
$('fetch').addEventListener('click', () => fetch('/api/nope').then((r) => { if (!r.ok) throw new Error(`The server answered ${r.status}`); }));
$('report').addEventListener('click', () => reportError(new Error('Reported on purpose with reportError()')));
