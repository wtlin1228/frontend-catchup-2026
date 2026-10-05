import './common-2.css';
import { h, mount } from '../lib/dom.js';
import { generateRows } from '../lib/rows.js';

const rows = generateRows(80);
const app = document.getElementById('app');
const KEY = 'keepalive-light:filter';

function listView(restore = {}) {
  const filter = restore.filter ?? sessionStorage.getItem(KEY) ?? '';
  const input = h('input', { class: 'input', type: 'search', value: filter, placeholder: 'Filter by name or team', style: { maxWidth: '20rem' } });
  const list = h('ul', { class: 'stack' });
  const render = () => {
    const needle = input.value.trim().toLowerCase();
    sessionStorage.setItem(KEY, input.value);
    mount(list, rows.filter((r) => !needle || `${r.name} ${r.team}`.toLowerCase().includes(needle)).map((r) =>
      h('li', null, h('a', { href: `#row-${r.id}`, onclick: (e) => { e.preventDefault(); open(r, input.value); } }, `${r.id}. ${r.name}`), h('span', { class: 'muted' }, ` ${r.team}`))));
  };
  input.addEventListener('input', render);
  render();
  mount(app, h('div', { class: 'stack' }, input, list));
  if (restore.scroll != null) window.scrollTo(0, restore.scroll);
}

function open(row, filter) {
  // Save what the list will need to come back: the filter and the scroll offset live in the history entry.
  history.replaceState({ view: 'list', filter, scroll: window.scrollY }, '');
  history.pushState({ view: 'detail', id: row.id }, '', `#row-${row.id}`);
  detailView(row);
}
function detailView(row) {
  mount(app, h('div', { class: 'panel stack', style: { maxWidth: '32rem' } },
    h('p', null, h('a', { href: '#', onclick: (e) => { e.preventDefault(); history.back(); } }, 'Back')),
    h('h2', null, row.name),
    h('dl', { class: 'kv' }, h('dt', null, 'Team'), h('dd', null, row.team), h('dt', null, 'Status'), h('dd', null, row.status), h('dt', null, 'Score'), h('dd', null, String(row.score)), h('dt', null, 'Updated'), h('dd', null, row.updated)),
  ));
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  const s = e.state;
  if (s?.view === 'detail') detailView(rows.find((r) => r.id === s.id));
  else listView(s ?? {});
});
history.scrollRestoration = 'manual';
const initial = location.hash.match(/^#row-(\d+)$/);
if (initial) detailView(rows.find((r) => r.id === Number(initial[1])) ?? rows[0]);
else listView();
