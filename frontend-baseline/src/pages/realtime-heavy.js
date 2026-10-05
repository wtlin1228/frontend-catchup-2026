import './realtime-heavy.css';
import { h, svg, mount } from '../lib/dom.js';

const METRICS = [
  { key: 'cpu', label: 'CPU', unit: '%', max: 100 },
  { key: 'mem', label: 'Memory', unit: '%', max: 100 },
  { key: 'rps', label: 'Requests per second', unit: '', max: 400 },
  { key: 'latency', label: 'p95 latency', unit: ' ms', max: 400 },
];
const POINTS = 120; // ring buffer length per series
const LOG_ROWS = 30;
const $ = (id) => document.getElementById(id);
const metricsEl = $('metrics');
const logBody = $('log-body');

const state = {
  series: Object.fromEntries(METRICS.map((m) => [m.key, []])),
  logs: [],
  strategy: 'patch',
  hz: 10,
  paused: false,
};

// --- source: EventSource. open/close is the subscription lifecycle frameworks wrap in effects or onMount/onDestroy.
let source = null;
function connect() {
  source?.close();
  source = new EventSource(`/api/stream?hz=${state.hz}`);
  setStatus('connecting', 'Connecting');
  source.onopen = () => setStatus('live', `Live at ${state.hz} Hz`);
  source.onerror = () => (source.readyState === EventSource.CLOSED ? setStatus('closed', 'Closed') : setStatus('reconnecting', 'Reconnecting'));
  source.addEventListener('metric', (e) => onMetric(JSON.parse(e.data)));
  source.addEventListener('log', (e) => onLog(JSON.parse(e.data)));
}
function disconnect() {
  source?.close();
  source = null;
  setStatus('paused', 'Paused');
}
function setStatus(kind, text) {
  $('conn-dot').dataset.state = kind;
  $('conn-status').textContent = text;
}

function onMetric(m) {
  for (const { key } of METRICS) {
    const series = state.series[key];
    series.push(m[key]);
    if (series.length > POINTS) series.shift();
  }
  scheduleRender();
}
function onLog(entry) {
  state.logs.unshift(entry);
  if (state.logs.length > LOG_ROWS) state.logs.length = LOG_ROWS;
  scheduleRender();
}

// --- scheduling: any number of events per frame becomes one DOM update per frame (what framework schedulers do).
let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render();
  });
}

let renders = 0;
let rendersSince = performance.now();
function render() {
  const t0 = performance.now();
  if (state.strategy === 'patch') patchRender();
  else rebuildRender();
  void metricsEl.offsetHeight; // include style + layout in the measurement
  $('render-ms').textContent = (performance.now() - t0).toFixed(2);
  renders++;
  if (t0 - rendersSince >= 1000) {
    $('updates').textContent = renders;
    renders = 0;
    rendersSince = t0;
  }
}

// --- derived values and the metric card ---
function stats(values) {
  if (!values.length) return { last: 0, min: 0, max: 0, avg: 0 };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  return { last: values[values.length - 1], min, max, avg: sum / values.length };
}
const fmt = (v, unit) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
const x = (i, n) => (((POINTS - n + i) / (POINTS - 1)) * 100).toFixed(2);
const y = (v, max) => (29 - (Math.min(v, max) / max) * 28).toFixed(2);
const linePath = (values, max) => (values.length < 2 ? '' : values.map((v, i) => `${i ? 'L' : 'M'}${x(i, values.length)},${y(v, max)}`).join(' '));
const areaPath = (values, max) => (values.length < 2 ? '' : `${linePath(values, max)} L100,30 L${x(0, values.length)},30 Z`);

function metricCard(m, values) {
  const s = stats(values);
  const refs = {};
  refs.root = h('article', { class: 'metric', 'aria-label': m.label },
    h('h2', { class: 'metric__label' }, m.label),
    (refs.value = h('p', { class: 'metric__value' }, fmt(s.last, m.unit))),
    svg('svg', { class: 'spark', viewBox: '0 0 100 30', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      (refs.area = svg('path', { class: 'spark__area', d: areaPath(values, m.max) })),
      (refs.line = svg('path', { class: 'spark__line', d: linePath(values, m.max) })),
    ),
    h('p', { class: 'metric__stats muted' },
      'min ', (refs.min = h('span', null, fmt(s.min, m.unit))),
      ' avg ', (refs.avg = h('span', null, fmt(s.avg, m.unit))),
      ' max ', (refs.max = h('span', null, fmt(s.max, m.unit))),
    ),
  );
  return refs;
}
const logRow = (e) =>
  h('tr', { class: `log__row log__row--${e.level}` },
    h('td', null, h('time', { datetime: new Date(e.t).toISOString() }, new Date(e.t).toLocaleTimeString())),
    h('td', null, h('span', { class: 'level' }, e.level)),
    h('td', null, e.message),
  );

// --- strategy 1: patch. Build the DOM once, then write only the values that changed (fine-grained updates).
let cards = null;
const rows = new Map(); // keyed rows: log id -> <tr>
function patchRender() {
  if (!cards) {
    cards = Object.fromEntries(METRICS.map((m) => [m.key, metricCard(m, state.series[m.key])]));
    mount(metricsEl, METRICS.map((m) => cards[m.key].root));
    rows.clear();
    logBody.replaceChildren();
  }
  for (const m of METRICS) {
    const refs = cards[m.key];
    const values = state.series[m.key];
    const s = stats(values);
    refs.value.textContent = fmt(s.last, m.unit);
    refs.min.textContent = fmt(s.min, m.unit);
    refs.avg.textContent = fmt(s.avg, m.unit);
    refs.max.textContent = fmt(s.max, m.unit);
    refs.line.setAttribute('d', linePath(values, m.max));
    refs.area.setAttribute('d', areaPath(values, m.max));
  }
  // Reuse rows by id, insert new ones where they belong, drop the ones that fell out of the window.
  const keep = new Set();
  let previous = null;
  for (const entry of state.logs) {
    keep.add(entry.id);
    let tr = rows.get(entry.id);
    if (!tr) rows.set(entry.id, (tr = logRow(entry)));
    const expected = previous ? previous.nextSibling : logBody.firstChild;
    if (tr !== expected) logBody.insertBefore(tr, expected);
    previous = tr;
  }
  for (const [id, tr] of rows) if (!keep.has(id)) { tr.remove(); rows.delete(id); }
}

// --- strategy 2: rebuild. Throw the subtree away and recreate it from state (the naive end of the spectrum).
function rebuildRender() {
  cards = null;
  rows.clear();
  mount(metricsEl, METRICS.map((m) => metricCard(m, state.series[m.key]).root));
  mount(logBody, state.logs.map(logRow));
}

// --- controls ---
$('pause-stream').addEventListener('click', (e) => {
  state.paused = !state.paused;
  e.currentTarget.textContent = state.paused ? 'Resume' : 'Pause';
  e.currentTarget.setAttribute('aria-pressed', String(state.paused));
  if (state.paused) disconnect();
  else connect();
});
$('rate').addEventListener('change', (e) => {
  state.hz = Number(e.target.value);
  if (!state.paused) connect();
});
for (const radio of document.querySelectorAll('input[name="strategy"]')) {
  radio.addEventListener('change', () => {
    state.strategy = radio.value;
    cards = null;
    scheduleRender();
  });
}
window.addEventListener('pagehide', () => source?.close());

patchRender(); // empty scaffold before the first event arrives
connect();
