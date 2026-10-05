import './common-2.css';
import { h, mount } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const vitals = { ttfb: null, fcp: null, lcp: null, cls: 0, inp: 0, longTasks: 0 };
const THRESHOLDS = { ttfb: [800, 1800], fcp: [1800, 3000], lcp: [2500, 4000], cls: [0.1, 0.25], inp: [200, 500] };
const LABELS = { ttfb: 'Time to first byte', fcp: 'First contentful paint', lcp: 'Largest contentful paint', cls: 'Cumulative layout shift', inp: 'Slowest interaction (INP, approx.)', longTasks: 'Long tasks' };

function rating(key, value) {
  const t = THRESHOLDS[key];
  if (!t || value == null) return '';
  return value <= t[0] ? 'good' : value <= t[1] ? 'needs improvement' : 'poor';
}
function paint() {
  mount($('vitals'), Object.entries(vitals).flatMap(([key, value]) => [
    h('dt', null, LABELS[key]),
    h('dd', null, value == null ? 'waiting' : key === 'cls' ? value.toFixed(3) : key === 'longTasks' ? String(value) : `${Math.round(value)} ms`, rating(key, value) ? h('span', { class: 'muted' }, ` ${rating(key, value)}`) : null),
  ]));
}
function observe(type, handler, options = {}) {
  try {
    new PerformanceObserver((list) => { handler(list.getEntries()); paint(); }).observe({ type, buffered: true, ...options });
  } catch { /* entry type not supported here */ }
}
const nav = performance.getEntriesByType('navigation')[0];
if (nav) vitals.ttfb = nav.responseStart;
observe('paint', (entries) => { for (const e of entries) if (e.name === 'first-contentful-paint') vitals.fcp = e.startTime; });
observe('largest-contentful-paint', (entries) => { vitals.lcp = entries.at(-1).startTime; });
observe('layout-shift', (entries) => { for (const e of entries) if (!e.hadRecentInput) vitals.cls += e.value; });
observe('event', (entries) => { for (const e of entries) if (e.interactionId) vitals.inp = Math.max(vitals.inp, e.duration); }, { durationThreshold: 16 });
observe('longtask', (entries) => { vitals.longTasks += entries.length; });
paint();

const busy = (ms) => { const end = performance.now() + ms; while (performance.now() < end) { /* burn */ } };
$('shift').addEventListener('click', () => $('before-table').append(h('div', { class: 'notice notice--warning', style: { marginBottom: '1rem' } }, 'Inserted without reserved space: everything below moved.')));
$('block').addEventListener('click', () => setTimeout(() => busy(300), 50));
$('slow').addEventListener('click', (e) => { busy(250); e.target.textContent = 'Slow interaction (done once)'; });
