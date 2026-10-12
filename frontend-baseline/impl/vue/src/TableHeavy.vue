<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, useTemplateRef } from 'vue';
import Layout from './Layout.vue';
import { COLUMNS, sortFilter } from '@baseline/src/lib/rows.js';
import '@baseline/src/pages/table.css';

const ROW_H = 36;
const OVERSCAN = 8;
const KEYS = { ArrowDown: (a) => a + 1, ArrowUp: (a) => a - 1, PageDown: (a, page) => a + page, PageUp: (a, page) => a - page, Home: () => 0, End: (a, page, max) => max };
// The rows and the order are large and immutable: shallowRefs, replaced as a whole. The DOM only ever holds the window.
const rows = shallowRef([]);
const order = shallowRef(new Uint32Array(0));
const sort = ref('id');
const dir = ref(1);
const filter = ref('');
const compute = ref('worker');
const selected = shallowRef(new Set());
const active = ref(0);
const top = ref(0);
const height = ref(0);
const viewport = useTemplateRef('viewport');
const container = useTemplateRef('container');
const status = useTemplateRef('status');
let queryId = 0, anchor = -1, raf = 0, timer = 0, t0 = 0, last = { ms: 0, where: '' };

const worker = new Worker(new URL('./table-heavy/worker.js', import.meta.url), { type: 'module' });
worker.onmessage = ({ data }) => {
  if (data.type === 'data') { rows.value = data.rows; order.value = new Uint32Array(0); }
  else if (data.type === 'order' && data.id === queryId) applyOrder(data.order, data.ms, 'worker');
};
function load(count) {
  status.value.textContent = `Generating ${count.toLocaleString()} rows…`;
  selected.value = new Set();
  active.value = 0;
  worker.postMessage({ type: 'generate', count });
}
function applyOrder(next, ms, where) {
  t0 = performance.now();
  last = { ms, where };
  order.value = next;
  active.value = Math.min(active.value, Math.max(0, next.length - 1));
}
// The query follows its sources; a watcher with explicit sources ignores what the callback reads and writes.
watch([rows, sort, dir, filter, compute], ([data, key, direction, needle, where]) => {
  if (!data.length) return;
  const params = { filter: needle, sort: key, dir: direction };
  if (where === 'main') { const started = performance.now(); applyOrder(sortFilter(data, params), performance.now() - started, 'main thread'); }
  else worker.postMessage({ type: 'query', id: ++queryId, ...params });
});
// The window is a computed slice of the order, following the scroll position and the viewport size.
const first = computed(() => Math.max(0, Math.floor(top.value / ROW_H) - OVERSCAN));
const inView = computed(() => {
  const end = Math.min(order.value.length, first.value + Math.ceil(height.value / ROW_H) + OVERSCAN * 2);
  const out = [];
  for (let pos = first.value; pos < end; pos++) { const index = order.value[pos]; if (rows.value[index]) out.push({ pos, index, row: rows.value[index] }); }
  return out;
});
// After the DOM shows a new order: force layout and report, as the baseline does right after its render.
watch(inView, () => {
  if (!t0) return;
  void container.value.offsetHeight;
  status.value.textContent = `${order.value.length.toLocaleString()} of ${rows.value.length.toLocaleString()} rows, sorted and filtered in ${last.ms.toFixed(1)} ms on the ${last.where}, rendered in ${(performance.now() - t0).toFixed(1)} ms`;
  t0 = 0;
}, { flush: 'post' });
const measureView = () => { top.value = viewport.value.scrollTop; height.value = viewport.value.clientHeight; };
let ro;
onMounted(() => { ro = new ResizeObserver(measureView); ro.observe(viewport.value); load(50000); });
onUnmounted(() => { ro.disconnect(); worker.terminate(); });
const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measureView(); }); };
const onFilter = (e) => { clearTimeout(timer); const value = e.target.value; timer = setTimeout(() => (filter.value = value), 150); };

const toggle = (set, index) => { const next = new Set(set); if (next.has(index)) next.delete(index); else next.add(index); return next; };
function onClick(e) {
  const rowEl = e.target.closest('.grid-row[data-index]');
  if (!rowEl) return;
  const index = Number(rowEl.dataset.index);
  const pos = Number(rowEl.dataset.pos);
  if (e.shiftKey && anchor >= 0) {
    const [from, to] = [anchor, pos].sort((a, b) => a - b);
    const next = new Set(selected.value);
    for (let p = from; p <= to; p++) next.add(order.value[p]);
    selected.value = next;
  } else { selected.value = toggle(selected.value, index); anchor = pos; }
  active.value = pos;
}
function onKeyDown(e) {
  const max = order.value.length - 1;
  const vp = viewport.value;
  const page = Math.floor(vp.clientHeight / ROW_H);
  let next = active.value;
  if (e.key === ' ') { selected.value = toggle(selected.value, order.value[active.value]); anchor = active.value; }
  else if (KEYS[e.key]) next = Math.max(0, Math.min(max, KEYS[e.key](active.value, page, max)));
  else return;
  e.preventDefault();
  active.value = next;
  const rowTop = next * ROW_H;
  if (rowTop < vp.scrollTop + ROW_H) vp.scrollTop = rowTop - ROW_H;
  else if (rowTop + ROW_H > vp.scrollTop + vp.clientHeight) vp.scrollTop = rowTop + ROW_H * 2 - vp.clientHeight;
}
function exportCsv() {
  const lines = [COLUMNS.map((c) => c.label).join(',')];
  for (const i of order.value) lines.push(COLUMNS.map((c) => JSON.stringify(String(rows.value[i][c.key]))).join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: 'rows.csv' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const selectionText = computed(() => { const n = selected.value.size; return n ? `${n.toLocaleString()} row${n === 1 ? '' : 's'} selected.` : 'No rows selected. Click selects, shift-click extends, arrow keys move, space toggles.'; });
</script>

<template>
  <Layout pattern="table" variant="heavy">
    <template #header>
      <h1>Grid</h1>
      <p>Rows are generated in a Web Worker. Only the rows in view exist in the DOM: the window is a computed slice of the order, keyed by position, so scrolling rewrites cells instead of creating elements. Sorting and filtering run in the worker or, for comparison, on the main thread. Rows can be selected with the mouse or keyboard and exported as CSV.</p>
    </template>
    <div class="grid-toolbar">
      <label>Rows
        <select id="rows" class="select" @change="load(Number($event.target.value))">
          <option value="1000">1,000</option><option value="50000" selected>50,000</option><option value="200000">200,000</option>
        </select>
      </label>
      <label for="filter" class="visually-hidden">Filter rows</label>
      <input id="filter" class="input" type="search" placeholder="Filter by name, team or status" style="max-width: 18rem" autocomplete="off" @input="onFilter" />
      <fieldset>
        <legend>Sort and filter on</legend>
        <label><input type="radio" name="compute" value="worker" v-model="compute" /> Worker</label>
        <label><input type="radio" name="compute" value="main" v-model="compute" /> Main thread</label>
      </fieldset>
      <button id="export" class="btn" type="button" @click="exportCsv">Export CSV</button>
      <span id="status" ref="status" class="muted" aria-live="polite"></span>
    </div>
    <div id="viewport" ref="viewport" class="grid-viewport" tabindex="0" role="grid" aria-label="Rows" :aria-rowcount="order.length" aria-multiselectable="true" @scroll.passive="onScroll" @click="onClick" @keydown="onKeyDown">
      <div class="grid-row grid-row--head" role="row" id="head">
        <div v-for="c in COLUMNS" :key="c.key" :class="['grid-cell', { num: c.numeric }]" role="columnheader" :aria-sort="sort === c.key ? (dir > 0 ? 'ascending' : 'descending') : undefined">
          <button type="button" @click="dir = sort === c.key ? -dir : 1; sort = c.key">{{ c.label }}</button>
        </div>
      </div>
      <div id="spacer" class="grid-spacer" :style="{ height: `${order.length * ROW_H}px` }">
        <div id="rows-container" ref="container" class="grid-rows" :style="{ transform: `translateY(${first * ROW_H}px)` }">
          <div v-for="{ pos, index, row } in inView" :key="pos" :class="['grid-row', { 'is-selected': selected.has(index), 'is-active': pos === active }]" role="row" :aria-rowindex="pos + 1" :aria-selected="selected.has(index)" :data-index="index" :data-pos="pos">
            <div v-for="c in COLUMNS" :key="c.key" :class="['grid-cell', { num: c.numeric }]" role="gridcell">{{ String(row[c.key]) }}</div>
          </div>
        </div>
      </div>
    </div>
    <p id="selection" class="muted" style="margin-top: var(--space-3)">{{ selectionText }}</p>
  </Layout>
</template>
