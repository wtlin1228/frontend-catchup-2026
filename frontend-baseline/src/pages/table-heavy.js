import './table.css';
import { h, mount, debounce } from '../lib/dom.js';
import { COLUMNS, sortFilter } from '../lib/rows.js';

const $ = (id) => document.getElementById(id);
const ROW_H = 36;
const OVERSCAN = 8;
const viewport = $('viewport');
const head = $('head');
const spacer = $('spacer');
const container = $('rows-container');
const state = { rows: [], order: new Uint32Array(0), sort: 'id', dir: 1, filter: '', compute: 'worker', selected: new Set(), anchor: -1, active: 0 };
let queryId = 0;
let raf = 0;

// Data lives in the worker (generated there, mirrored here once). Queries run where the radio says.
const worker = new Worker(new URL('./table.worker.js', import.meta.url), { type: 'module' });
worker.onmessage = ({ data }) => {
  if (data.type === 'data') {
    state.rows = data.rows;
    query();
  } else if (data.type === 'order' && data.id === queryId) {
    applyOrder(data.order, data.ms, 'worker');
  }
};
function load(count) {
  $('status').textContent = `Generating ${count.toLocaleString()} rows…`;
  state.selected.clear();
  state.active = 0;
  worker.postMessage({ type: 'generate', count });
}
function query() {
  const params = { filter: state.filter, sort: state.sort, dir: state.dir };
  if (state.compute === 'main') {
    const t0 = performance.now();
    const order = sortFilter(state.rows, params);
    applyOrder(order, performance.now() - t0, 'main thread');
  } else {
    worker.postMessage({ type: 'query', id: ++queryId, ...params });
  }
}
function applyOrder(order, ms, where) {
  state.order = order;
  state.active = Math.min(state.active, Math.max(0, order.length - 1));
  spacer.style.height = `${order.length * ROW_H}px`;
  viewport.setAttribute('aria-rowcount', order.length);
  $('status').textContent = `${order.length.toLocaleString()} of ${state.rows.length.toLocaleString()} rows, sorted and filtered in ${ms.toFixed(1)} ms on the ${where}`;
  render();
}

// --- virtual window: render only what is visible plus overscan ---
function render() {
  const first = Math.max(0, Math.floor(viewport.scrollTop / ROW_H) - OVERSCAN);
  const visible = Math.ceil(viewport.clientHeight / ROW_H) + OVERSCAN * 2;
  const last = Math.min(state.order.length, first + visible);
  container.style.transform = `translateY(${first * ROW_H}px)`;
  const nodes = [];
  for (let pos = first; pos < last; pos++) {
    const index = state.order[pos];
    const row = state.rows[index];
    const selected = state.selected.has(index);
    nodes.push(h('div', {
      class: `grid-row${selected ? ' is-selected' : ''}${pos === state.active ? ' is-active' : ''}`,
      role: 'row', 'aria-rowindex': pos + 1, 'aria-selected': String(selected), dataset: { index, pos },
    }, COLUMNS.map((c) => h('div', { class: `grid-cell${c.numeric ? ' num' : ''}`, role: 'gridcell' }, String(row[c.key])))));
  }
  mount(container, nodes);
}
viewport.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }, { passive: true });
new ResizeObserver(() => render()).observe(viewport);

// --- header: sort buttons ---
function renderHead() {
  mount(head, COLUMNS.map((c) =>
    h('div', { class: `grid-cell${c.numeric ? ' num' : ''}`, role: 'columnheader', 'aria-sort': state.sort === c.key ? (state.dir > 0 ? 'ascending' : 'descending') : null },
      h('button', { type: 'button', onclick: () => { state.dir = state.sort === c.key ? -state.dir : 1; state.sort = c.key; renderHead(); query(); } }, c.label))));
}
renderHead();

// --- selection and keyboard ---
function describeSelection() {
  const n = state.selected.size;
  $('selection').textContent = n ? `${n.toLocaleString()} row${n === 1 ? '' : 's'} selected.` : 'No rows selected. Click selects, shift-click extends, arrow keys move, space toggles.';
}
function toggle(index) { state.selected.has(index) ? state.selected.delete(index) : state.selected.add(index); }
viewport.addEventListener('click', (e) => {
  const rowEl = e.target.closest('.grid-row[data-index]');
  if (!rowEl) return;
  const index = Number(rowEl.dataset.index);
  const pos = Number(rowEl.dataset.pos);
  if (e.shiftKey && state.anchor >= 0) {
    const [from, to] = [state.anchor, pos].sort((a, b) => a - b);
    for (let p = from; p <= to; p++) state.selected.add(state.order[p]);
  } else {
    toggle(index);
    state.anchor = pos;
  }
  state.active = pos;
  describeSelection();
  render();
});
viewport.addEventListener('keydown', (e) => {
  const max = state.order.length - 1;
  if (e.key === 'ArrowDown') state.active = Math.min(max, state.active + 1);
  else if (e.key === 'ArrowUp') state.active = Math.max(0, state.active - 1);
  else if (e.key === 'PageDown') state.active = Math.min(max, state.active + Math.floor(viewport.clientHeight / ROW_H));
  else if (e.key === 'PageUp') state.active = Math.max(0, state.active - Math.floor(viewport.clientHeight / ROW_H));
  else if (e.key === 'Home') state.active = 0;
  else if (e.key === 'End') state.active = max;
  else if (e.key === ' ') { toggle(state.order[state.active]); state.anchor = state.active; describeSelection(); }
  else return;
  e.preventDefault();
  const top = state.active * ROW_H;
  if (top < viewport.scrollTop + ROW_H) viewport.scrollTop = top - ROW_H;
  else if (top + ROW_H > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = top + ROW_H * 2 - viewport.clientHeight;
  render();
});

// --- toolbar ---
$('rows').addEventListener('change', (e) => load(Number(e.target.value)));
$('filter').addEventListener('input', debounce((e) => { state.filter = e.target.value; query(); }, 150));
for (const radio of document.querySelectorAll('input[name="compute"]')) radio.addEventListener('change', () => { state.compute = radio.value; query(); });
$('export').addEventListener('click', () => {
  const lines = [COLUMNS.map((c) => c.label).join(',')];
  for (const i of state.order) lines.push(COLUMNS.map((c) => JSON.stringify(String(state.rows[i][c.key]))).join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'rows.csv' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', () => worker.terminate());
load(50000);
