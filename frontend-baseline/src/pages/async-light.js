import './common-2.css';
import { h, mount } from '../lib/dom.js';

const TAGS = ['rendering', 'state', 'forms', 'performance', 'routing'];
const $ = (id) => document.getElementById(id);
const panel = $('panel');
const tabs = {};
let active = TAGS[0];
let requestId = 0;
const t0 = performance.now();
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`));

mount($('tabs'), TAGS.map((tag) => (tabs[tag] = h('button', { role: 'tab', type: 'button', 'aria-selected': 'false', onclick: () => select(tag) }, tag))));

async function select(tag) {
  active = tag;
  for (const [t, el] of Object.entries(tabs)) el.setAttribute('aria-selected', String(t === active));
  const id = ++requestId; // latest request wins; older responses are dropped when they arrive
  const transition = $('transition').checked;
  if (transition) panel.classList.add('stale');
  else mount(panel, h('p', { class: 'skeleton', style: { height: '8rem' } }, ' '));
  tabs[tag].setAttribute('aria-busy', 'true');
  try {
    const res = await fetch(`/api/posts?tag=${tag}&limit=5`);
    const { items } = await res.json();
    if (id !== requestId) return log(`${tag}: response dropped, a newer request won`, 'err');
    mount(panel, items.length ? h('ul', { class: 'stack' }, items.map((p) => h('li', null, h('a', { href: `/dynamic/heavy.html#/posts/${p.id}` }, p.title)))) : h('p', { class: 'muted' }, 'No posts with this tag.'));
    log(`${tag}: ${items.length} posts painted`, 'ok');
  } catch (err) {
    if (id === requestId) mount(panel, h('p', { class: 'notice notice--error' }, `Could not load ${tag}: ${err.message}`));
  } finally {
    tabs[tag].removeAttribute('aria-busy');
    if (id === requestId) panel.classList.remove('stale');
  }
}
select(active);
