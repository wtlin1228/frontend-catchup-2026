import './common-2.css';
import { h, mount } from '../lib/dom.js';
import { generateRows } from '../lib/rows.js';

const $ = (id) => document.getElementById(id);
const rows = generateRows(200);
const created = { list: 0, form: 0, live: 0 };

// Each panel factory returns an element plus pause/resume so a hidden panel costs nothing.
const factories = {
  list() {
    created.list++;
    const input = h('input', { class: 'input', type: 'search', placeholder: 'Filter 200 rows', style: { maxWidth: '20rem' } });
    const box = h('div', { style: { height: '14rem', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' } });
    const render = () => { const q = input.value.toLowerCase(); mount(box, h('ul', { class: 'stack', style: { padding: '0.5rem 1rem' } }, rows.filter((r) => r.name.toLowerCase().includes(q)).map((r) => h('li', null, `${r.id}. ${r.name}`)))); };
    input.addEventListener('input', render);
    render();
    return { el: h('div', null, h('p', { class: 'muted' }, 'Scroll the box and type a filter, then switch tabs and come back.'), input, box) };
  },
  form() {
    created.form++;
    return { el: h('div', { class: 'stack', style: { maxWidth: '28rem' } }, h('p', { class: 'muted' }, 'Type something, switch tabs, come back.'), h('textarea', { class: 'textarea', rows: 5, placeholder: 'Draft a message' })) };
  },
  live() {
    created.live++;
    const canvas = h('canvas', { width: 480, height: 120, style: { width: '100%', maxWidth: '30rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' } });
    const ctx = canvas.getContext('2d');
    let frames = 0;
    let raf = 0;
    const draw = () => {
      frames++;
      ctx.clearRect(0, 0, 480, 120);
      ctx.fillStyle = '#e76125';
      for (let i = 0; i < 24; i++) ctx.fillRect(i * 20, 60 - 50 * Math.sin((frames + i * 8) / 20), 14, 100);
      raf = requestAnimationFrame(draw);
    };
    const el = h('div', null, h('p', { class: 'muted' }, 'Frames drawn so far: ', h('span', { id: 'frames' }, '0'), '. The loop pauses while this tab is hidden.'), canvas);
    const counter = setInterval(() => { el.querySelector('#frames').textContent = frames; }, 500);
    return { el, pause() { cancelAnimationFrame(raf); raf = 0; }, resume() { if (!raf) raf = requestAnimationFrame(draw); }, destroy() { cancelAnimationFrame(raf); clearInterval(counter); } };
  },
};

const panels = {};
let active = 'list';
const tabs = {};
mount($('tabs'), Object.keys(factories).map((key) => (tabs[key] = h('button', { role: 'tab', type: 'button', onclick: () => show(key) }, { list: 'List', form: 'Form', live: 'Live' }[key]))));

function show(key) {
  const keep = $('keep').checked;
  for (const [k, panel] of Object.entries(panels)) {
    if (k === key) continue;
    if (keep) { panel.el.hidden = true; panel.el.inert = true; panel.pause?.(); }
    else { panel.destroy?.(); panel.el.remove(); delete panels[k]; }
  }
  if (!panels[key]) { panels[key] = factories[key](); panels[key].el.setAttribute('role', 'tabpanel'); $('panels').append(panels[key].el); }
  const panel = panels[key];
  panel.el.hidden = false;
  panel.el.inert = false;
  panel.resume?.();
  active = key;
  for (const [k, el] of Object.entries(tabs)) el.setAttribute('aria-selected', String(k === active));
  $('stats').textContent = `Panels created: list ${created.list}, form ${created.form}, live ${created.live}. Mounted now: ${Object.keys(panels).length}.`;
}
$('keep').addEventListener('change', () => show(active));
document.addEventListener('visibilitychange', () => (document.hidden ? panels[active]?.pause?.() : panels[active]?.resume?.()));
show(active);
