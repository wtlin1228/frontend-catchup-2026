import './common-2.css';
import { h, svg, mount } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
let spans = [];
let traceStart = 0;
const span = (name, start, end, extra = {}) => spans.push({ name, start: start - traceStart, duration: end - start, ...extra });

async function timedFetch(url, parent) {
  const t0 = performance.now();
  const res = await fetch(url);
  const data = await res.json();
  const t1 = performance.now();
  const serverMs = Number(res.headers.get('server-timing')?.match(/dur=([\d.]+)/)?.[1] ?? 0);
  span(`fetch ${url}`, t0, t1, { parent, status: res.status, serverMs });
  if (serverMs) span('server (from Server-Timing, placed at response end)', t1 - serverMs, t1, { parent: `fetch ${url}` });
  return data;
}

async function run() {
  spans = [];
  traceStart = performance.now();
  performance.mark('trace-start');
  const post = await timedFetch('/api/posts/3', 'load');
  const { items } = await timedFetch(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=3`, 'load');
  const r0 = performance.now();
  mount($('result'), h('div', { class: 'panel stack' }, h('h2', null, post.title), h('p', null, post.excerpt), h('ul', null, items.filter((p) => p.id !== post.id).map((p) => h('li', null, p.title)))));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  span('render and paint', r0, performance.now(), { parent: 'load' });
  const end = performance.now();
  spans.unshift({ name: 'load', start: 0, duration: end - traceStart });
  performance.measure('trace', { start: traceStart, end, detail: { spans } });
  draw();
  const resourceTimings = performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/posts')).slice(-2);
  $('summary').textContent = `${spans.length} spans, ${Math.round(end - traceStart)} ms total. Resource timing saw Server-Timing entries: ${resourceTimings.map((e) => (e.serverTiming ?? []).map((s) => `${s.name}=${s.duration}ms`).join(',') || 'none').join(' | ')}.`;
  $('export').disabled = false;
}

function draw() {
  const total = Math.max(...spans.map((s) => s.start + s.duration));
  const width = 700, rowH = 26, left = 260;
  const scale = (ms) => left + (ms / total) * (width - left - 10);
  mount($('waterfall'), svg('svg', { viewBox: `0 0 ${width} ${spans.length * rowH + 10}`, style: 'width:100%;min-width:40rem;height:auto;font:12px var(--font-mono)' },
    spans.map((s, i) => svg('g', { transform: `translate(0 ${i * rowH + 5})` },
      svg('text', { x: 0, y: 16, fill: 'currentColor' }, s.name.length > 38 ? `${s.name.slice(0, 37)}…` : s.name),
      svg('rect', { x: scale(s.start), y: 4, width: Math.max(2, scale(s.start + s.duration) - scale(s.start)), height: 16, rx: 3, fill: s.name.startsWith('server') ? 'var(--info)' : s.name === 'load' ? 'var(--text-2)' : 'var(--accent)', opacity: 0.85 }),
      svg('text', { x: Math.min(width - 60, scale(s.start + s.duration) + 4), y: 16, fill: 'var(--text-2)' }, `${s.duration.toFixed(1)} ms`),
    ))));
}

$('run').addEventListener('click', run);
$('export').addEventListener('click', () => {
  const base = Date.now() - performance.now();
  const otlp = { resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'frontend-baseline' } }] }, scopeSpans: [{ spans: spans.map((s) => ({ name: s.name, parentSpan: s.parent ?? null, startTimeUnixNano: String(Math.round((base + traceStart + s.start) * 1e6)), endTimeUnixNano: String(Math.round((base + traceStart + s.start + s.duration) * 1e6)), attributes: s.status ? [{ key: 'http.status', value: { intValue: s.status } }] : [] })) }] }] };
  const url = URL.createObjectURL(new Blob([JSON.stringify(otlp, null, 2)], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: 'trace.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
