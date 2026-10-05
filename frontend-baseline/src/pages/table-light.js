import './table.css';
import { h, mount } from '../lib/dom.js';
import { COLUMNS, generateRows, sortFilter } from '../lib/rows.js';

const rows = generateRows(60);
const state = { sort: 'id', dir: 1, filter: '' };
const head = document.getElementById('head');
const body = document.getElementById('body');

function render() {
  mount(head, COLUMNS.map((c) =>
    h('th', { scope: 'col', class: c.numeric ? 'num' : '', 'aria-sort': state.sort === c.key ? (state.dir > 0 ? 'ascending' : 'descending') : null },
      h('button', { type: 'button', onclick: () => { state.dir = state.sort === c.key ? -state.dir : 1; state.sort = c.key; render(); } }, c.label))));
  const order = sortFilter(rows, state);
  mount(body, [...order].map((i) => h('tr', null, COLUMNS.map((c) => h('td', { class: c.numeric ? 'num' : '' }, String(rows[i][c.key]))))));
  document.getElementById('count').textContent = `${order.length} of ${rows.length} rows`;
}
document.getElementById('filter').addEventListener('input', (e) => { state.filter = e.target.value; render(); });
render();
