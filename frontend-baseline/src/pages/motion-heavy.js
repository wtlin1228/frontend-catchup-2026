import './motion-heavy.css';
import { h, mount } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- tiles: FLIP for moves, WAAPI for enter and leave, view transitions for layout
const list = $('tiles');
let tiles = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, hue: (i * 137) % 360 }));
let nextId = 13;

const tileEl = (t) => h('li', { class: 'tile', dataset: { id: t.id }, style: { background: `hsl(${t.hue} 70% 55%)`, viewTransitionName: `tile-${t.id}` } }, String(t.id));
const render = () => mount(list, tiles.map(tileEl));

// First, Last, Invert, Play: measure before, mutate, measure after, animate from the difference.
function flip(mutate) {
  const before = new Map([...list.children].map((el) => [el.dataset.id, el.getBoundingClientRect()]));
  mutate();
  if (reduceMotion) return;
  for (const el of list.children) {
    const prev = before.get(el.dataset.id);
    const next = el.getBoundingClientRect();
    if (!prev) {
      el.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
      continue;
    }
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
  }
}

$('shuffle').addEventListener('click', () => flip(() => {
  for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
  render();
}));
$('sort').addEventListener('click', () => flip(() => { tiles.sort((a, b) => a.id - b.id); render(); }));
$('add').addEventListener('click', () => flip(() => {
  tiles.splice(Math.floor(Math.random() * (tiles.length + 1)), 0, { id: nextId, hue: (nextId * 137) % 360 });
  nextId++;
  render();
}));
$('remove').addEventListener('click', async () => {
  if (!tiles.length) return;
  const victim = tiles[Math.floor(Math.random() * tiles.length)];
  const el = list.querySelector(`[data-id="${victim.id}"]`);
  if (!reduceMotion) await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.6)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished;
  flip(() => { tiles = tiles.filter((t) => t !== victim); render(); });
});
$('layout').addEventListener('click', () => {
  const toggle = () => { list.classList.toggle('tiles--grid'); list.classList.toggle('tiles--list'); };
  // Each tile has a unique view-transition-name, so the browser morphs every tile between layouts.
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(toggle);
  else toggle();
});
render();

// ---------- draggable with a spring: pointer events + capture, velocity, rAF integration
const card = $('drag-card');
let pos = { x: 0, y: 0 };
let vel = { x: 0, y: 0 };
let last = null;
let dragging = false;
let raf = 0;
const paint = () => { card.style.transform = `translate(${pos.x}px, ${pos.y}px)`; };

card.addEventListener('pointerdown', (e) => {
  dragging = true;
  cancelAnimationFrame(raf);
  card.setPointerCapture(e.pointerId);
  card.classList.add('is-dragging');
  last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
});
card.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dt = Math.max(1, e.timeStamp - last.t);
  vel = { x: ((e.clientX - last.x) / dt) * 16, y: ((e.clientY - last.y) / dt) * 16 }; // px per frame at 60 Hz
  pos = { x: pos.x + e.clientX - last.x, y: pos.y + e.clientY - last.y };
  last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  paint();
});
const release = () => {
  if (!dragging) return;
  dragging = false;
  card.classList.remove('is-dragging');
  spring();
};
card.addEventListener('pointerup', release);
card.addEventListener('pointercancel', release);
card.addEventListener('keydown', (e) => {
  const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
  if (step) { cancelAnimationFrame(raf); pos = { x: pos.x + step[0], y: pos.y + step[1] }; paint(); }
  else if (e.key === 'Escape') spring();
  else return;
  e.preventDefault();
});

function spring() {
  if (reduceMotion) { pos = { x: 0, y: 0 }; paint(); return; }
  const stiffness = 0.12;
  const damping = 0.8;
  const step = () => {
    vel = { x: (vel.x - pos.x * stiffness) * damping, y: (vel.y - pos.y * stiffness) * damping };
    pos = { x: pos.x + vel.x, y: pos.y + vel.y };
    paint();
    if (Math.abs(pos.x) + Math.abs(pos.y) + Math.abs(vel.x) + Math.abs(vel.y) > 0.5) raf = requestAnimationFrame(step);
    else { pos = { x: 0, y: 0 }; paint(); }
  };
  raf = requestAnimationFrame(step);
}
