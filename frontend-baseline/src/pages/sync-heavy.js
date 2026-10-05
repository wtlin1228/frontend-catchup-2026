import './common-2.css';
import { h, mount, uid } from '../lib/dom.js';
import { createSyncClient } from '../lib/sync.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));
let lastVersion = 0;
const client = createSyncClient({ storageKey: 'sync-heavy', onChange: render });

function render() {
  mount($('list'), client.notes.map((n) =>
    h('li', { class: 'cluster' },
      h('input', { class: 'input', value: n.text, style: { maxWidth: '20rem' }, 'aria-label': 'Note text', onchange: (e) => client.put(n.id, e.target.value) }),
      h('span', { class: 'tag' }, n.pending ? 'waiting to sync' : `v${n.version} by ${n.updatedBy}`),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => client.remove(n.id) }, 'Delete'),
    )));
  mount($('conflicts'), client.conflicts.length
    ? client.conflicts.map((c) => h('div', { class: 'notice notice--warning stack' },
        h('p', null, h('strong', null, `Conflict on ${c.id}`), ` (server is at v${c.server.version})`),
        h('p', null, `Mine: "${c.mine}"`), h('p', null, `Theirs: "${c.theirs}"`),
        h('p', { class: 'cluster' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: () => client.resolve(c, 'mine') }, 'Keep mine'), h('button', { class: 'btn btn--sm', type: 'button', onclick: () => client.resolve(c, 'theirs') }, 'Take theirs'))))
    : h('p', { class: 'muted' }, 'None.'));
  $('status').textContent = `${navigator.onLine ? 'Online' : 'Offline'}. Local version ${client.version}, ${client.outbox.length} change${client.outbox.length === 1 ? '' : 's'} in the outbox, client ${client.clientId}.`;
  if (client.version !== lastVersion) { log(`local state at v${client.version}`); lastVersion = client.version; }
  if (client.conflicts.length) toast(`${client.conflicts.length} conflict${client.conflicts.length === 1 ? '' : 's'} to resolve`, { type: 'error' });
}

$('add').addEventListener('submit', (e) => { e.preventDefault(); client.put(uid('n'), $('text').value.trim()); $('text').value = ''; });
$('replay').addEventListener('click', () => client.push());
$('other').addEventListener('click', async () => {
  // A write from "another device": straight to the server, no base version, so it always wins there.
  const first = client.notes[0];
  if (!first) return;
  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client: 'other-device', ops: [{ opId: uid('op'), type: 'put', note: { id: first.id, text: `Edited elsewhere at ${new Date().toLocaleTimeString()}` } }] }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    log('other device wrote to the server', 'ok');
  } catch (err) {
    // DevTools "Offline" blocks this request too; real offline (Wi-Fi off) still reaches localhost.
    log(`other device could not reach the server (${err.message}); use a second tab for this button`, 'err');
  }
});
window.addEventListener('online', () => { log('online'); render(); });
window.addEventListener('offline', () => { log('offline'); render(); });
const unsubscribe = client.subscribe();
window.addEventListener('pagehide', unsubscribe);
client.pull().catch(() => log('pull failed, working from local state', 'err')).finally(render);
