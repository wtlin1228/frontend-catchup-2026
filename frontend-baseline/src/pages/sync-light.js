import './common-2.css';
import { h, mount, uid } from '../lib/dom.js';
import { createSyncClient } from '../lib/sync.js';

const $ = (id) => document.getElementById(id);
const client = createSyncClient({ storageKey: 'sync-light', onChange: render });

function render() {
  mount($('list'), client.notes.map((n) =>
    h('li', { class: 'cluster' },
      h('input', { class: 'input', value: n.text, style: { maxWidth: '22rem' }, 'aria-label': 'Note text', onchange: (e) => client.put(n.id, e.target.value) }),
      n.pending ? h('span', { class: 'tag' }, 'waiting to sync') : h('span', { class: 'tag' }, `v${n.version}`),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => client.remove(n.id) }, 'Delete'),
    )));
  $('status').textContent = `${navigator.onLine ? 'Online' : 'Offline'}. ${client.outbox.length} change${client.outbox.length === 1 ? '' : 's'} in the outbox.`;
}
$('add').addEventListener('submit', (e) => {
  e.preventDefault();
  client.put(uid('n'), $('text').value.trim());
  $('text').value = '';
});
$('replay').addEventListener('click', () => client.push());
window.addEventListener('online', render);
window.addEventListener('offline', render);
client.pull().catch(() => {}).finally(render);
