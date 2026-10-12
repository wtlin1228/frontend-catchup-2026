<script setup>
import { ref, computed, watch, useTemplateRef } from 'vue';
import Layout from './Layout.vue';
import '@baseline/src/pages/realtime-heavy.css';

const METRICS = [
  { key: 'cpu', label: 'CPU', unit: '%', max: 100 },
  { key: 'mem', label: 'Memory', unit: '%', max: 100 },
  { key: 'rps', label: 'Requests per second', unit: '', max: 400 },
  { key: 'latency', label: 'p95 latency', unit: ' ms', max: 400 },
];
const POINTS = 120;
const LOG_ROWS = 30;

// The data lives in plain ring buffers; events only mark them dirty. One requestAnimationFrame per burst
// bumps `frame`, the single ref the view computes from. "Patch" is Vue's normal patching; "rebuild" keys
// the subtree with the frame number, so it is recreated every frame.
const buffers = { series: Object.fromEntries(METRICS.map((m) => [m.key, []])), logs: [] };
const frame = ref(0);
const strategy = ref('patch');
const hz = ref(10);
const paused = ref(false);
const status = ref(['connecting', 'Connecting']);
const metricsEl = useTemplateRef('metrics');
const renderMs = useTemplateRef('renderMs');
const updates = useTemplateRef('updates');
let t0 = 0;
const counter = { renders: 0, since: performance.now() };

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

const cards = computed(() => { frame.value; return METRICS.map((m) => { const values = buffers.series[m.key]; return { m, s: stats(values), line: linePath(values, m.max), area: areaPath(values, m.max) }; }); });
const logs = computed(() => { frame.value; return [...buffers.logs]; });
const subtreeKey = computed(() => (strategy.value === 'rebuild' ? frame.value : 0));

let source = null;
function connect() {
  source?.close();
  if (paused.value) { source = null; status.value = ['paused', 'Paused']; return; }
  source = new EventSource(`/api/stream?hz=${hz.value}`);
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; t0 = performance.now(); frame.value++; });
  };
  status.value = ['connecting', 'Connecting'];
  source.onopen = () => (status.value = ['live', `Live at ${hz.value} Hz`]);
  source.onerror = () => (status.value = source.readyState === EventSource.CLOSED ? ['closed', 'Closed'] : ['reconnecting', 'Reconnecting']);
  source.addEventListener('metric', (e) => {
    const m = JSON.parse(e.data);
    for (const { key } of METRICS) { const s = buffers.series[key]; s.push(m[key]); if (s.length > POINTS) s.shift(); }
    schedule();
  });
  source.addEventListener('log', (e) => { buffers.logs.unshift(JSON.parse(e.data)); if (buffers.logs.length > LOG_ROWS) buffers.logs.length = LOG_ROWS; schedule(); });
}
watch([hz, paused], connect, { immediate: true });
window.addEventListener('pagehide', () => source?.close());

// After the DOM is patched for a frame: force layout and write the timing into the DOM.
watch(frame, () => {
  if (!t0) return;
  void metricsEl.value.offsetHeight;
  renderMs.value.textContent = (performance.now() - t0).toFixed(2);
  counter.renders++;
  if (t0 - counter.since >= 1000) { updates.value.textContent = counter.renders; counter.renders = 0; counter.since = t0; }
  t0 = 0;
}, { flush: 'post' });
</script>

<template>
  <Layout pattern="realtime" variant="heavy">
    <template #header>
      <h1>Dashboard</h1>
      <p>Four metrics stream from <code>/api/stream</code> as server-sent events, up to 30 times a second. The data lives in ring buffers outside the component; events are coalesced into one ref write per frame, so Vue patches at most once per frame. "Patch nodes" is Vue's normal patching; "Rebuild subtree" recreates the metrics and the log every frame through a changing key, the naive end of the spectrum.</p>
    </template>
    <div class="dash-toolbar">
      <p class="dash-status"><span id="conn-dot" class="dot" :data-state="status[0]"></span> <span id="conn-status">{{ status[1] }}</span></p>
      <button id="pause-stream" class="btn" type="button" :aria-pressed="paused" @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button>
      <label class="dash-rate">Rate
        <select id="rate" class="select" v-model.number="hz">
          <option value="2">2 Hz</option><option value="10">10 Hz</option><option value="30">30 Hz</option>
        </select>
      </label>
      <fieldset class="dash-strategy">
        <legend>DOM strategy</legend>
        <label><input type="radio" name="strategy" value="patch" v-model="strategy" /> Patch nodes</label>
        <label><input type="radio" name="strategy" value="rebuild" v-model="strategy" /> Rebuild subtree</label>
      </fieldset>
      <p class="dash-perf muted"><span id="updates" ref="updates">0</span> renders/s, last render <span id="render-ms" ref="renderMs">0.0</span> ms</p>
    </div>
    <section id="metrics" ref="metrics" class="metrics" aria-label="Live metrics">
      <template :key="subtreeKey">
        <article v-for="{ m, s, line, area } in cards" :key="m.key" class="metric" :aria-label="m.label">
          <h2 class="metric__label">{{ m.label }}</h2>
          <p class="metric__value">{{ fmt(s.last, m.unit) }}</p>
          <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <path class="spark__area" :d="area" />
            <path class="spark__line" :d="line" />
          </svg>
          <p class="metric__stats muted">min <span>{{ fmt(s.min, m.unit) }}</span> avg <span>{{ fmt(s.avg, m.unit) }}</span> max <span>{{ fmt(s.max, m.unit) }}</span></p>
        </article>
      </template>
    </section>
    <section class="dash-log">
      <h2>Events</h2>
      <table class="log">
        <thead><tr><th>When</th><th>Level</th><th>Message</th></tr></thead>
        <tbody id="log-body">
          <template :key="`log-${subtreeKey}`">
            <tr v-for="e in logs" :key="e.id" :class="`log__row log__row--${e.level}`">
              <td><time :datetime="new Date(e.t).toISOString()">{{ new Date(e.t).toLocaleTimeString() }}</time></td>
              <td><span class="level">{{ e.level }}</span></td>
              <td>{{ e.message }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>
  </Layout>
</template>
