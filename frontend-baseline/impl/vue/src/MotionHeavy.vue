<script setup>
import { ref, nextTick, useTemplateRef } from 'vue';
import Layout from './Layout.vue';
import '@baseline/src/pages/motion-heavy.css';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tiles: <TransitionGroup> animates moves (FLIP), enters and leaves from the CSS classes below. The layout switch goes through
// the View Transitions API, with the group's own transitions off for its duration, or both would animate the same move.
const tiles = ref(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, hue: (i * 137) % 360 })));
const grid = ref(true);
const switching = ref(false);
let nextId = 13;
const shuffle = () => { const a = [...tiles.value]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } tiles.value = a; };
const sort = () => { tiles.value = [...tiles.value].sort((a, b) => a.id - b.id); };
const add = () => { const a = [...tiles.value]; a.splice(Math.floor(Math.random() * (a.length + 1)), 0, { id: nextId, hue: (nextId * 137) % 360 }); nextId++; tiles.value = a; };
const remove = () => { if (!tiles.value.length) return; const victim = tiles.value[Math.floor(Math.random() * tiles.value.length)].id; tiles.value = tiles.value.filter((t) => t.id !== victim); };
async function layout() {
  const swap = async () => { grid.value = !grid.value; await nextTick(); };
  if (!document.startViewTransition || reduceMotion) return swap();
  switching.value = true;
  await nextTick();
  try { await document.startViewTransition(swap).finished; } finally { switching.value = false; }
}

// The card: Vue ships enter, leave and move transitions but no spring, so this is the baseline's drag and rAF spring in a component.
const card = useTemplateRef('card');
const dragging = ref(false);
let pos = { x: 0, y: 0 };
let vel = { x: 0, y: 0 };
let last = null;
let raf = 0;
const paint = () => { card.value.style.transform = `translate(${pos.x}px, ${pos.y}px)`; };
function spring() {
  if (reduceMotion) { pos = { x: 0, y: 0 }; paint(); return; }
  const step = () => {
    vel = { x: (vel.x - pos.x * 0.12) * 0.8, y: (vel.y - pos.y * 0.12) * 0.8 };
    pos = { x: pos.x + vel.x, y: pos.y + vel.y };
    paint();
    if (Math.abs(pos.x) + Math.abs(pos.y) + Math.abs(vel.x) + Math.abs(vel.y) > 0.5) raf = requestAnimationFrame(step);
    else { pos = { x: 0, y: 0 }; paint(); }
  };
  raf = requestAnimationFrame(step);
}
function down(e) { cancelAnimationFrame(raf); e.currentTarget.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY, t: e.timeStamp }; dragging.value = true; }
function move(e) {
  if (!dragging.value) return;
  const dt = Math.max(1, e.timeStamp - last.t);
  vel = { x: ((e.clientX - last.x) / dt) * 16, y: ((e.clientY - last.y) / dt) * 16 };
  pos = { x: pos.x + e.clientX - last.x, y: pos.y + e.clientY - last.y };
  last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  paint();
}
function release() { if (!dragging.value) return; dragging.value = false; spring(); }
function key(e) {
  const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
  if (step) { cancelAnimationFrame(raf); pos = { x: pos.x + step[0], y: pos.y + step[1] }; paint(); }
  else if (e.key === 'Escape') spring();
  else return;
  e.preventDefault();
}
</script>

<template>
  <Layout pattern="motion" variant="heavy">
    <template #header>
      <h1>Scripted motion</h1>
      <p>The baseline's motion page in Vue 3.5: <code>&lt;TransitionGroup&gt;</code> animates the tiles' moves, enters and leaves from four CSS classes, the layout switch calls the View Transitions API around a state change, and the throwable card is still a hand-written spring, because Vue ships none.</p>
    </template>
    <h2>Reorder, add, remove</h2>
    <div class="cluster" style="margin-bottom: var(--space-4)">
      <button id="shuffle" class="btn" type="button" @click="shuffle">Shuffle</button>
      <button id="sort" class="btn" type="button" @click="sort">Sort</button>
      <button id="add" class="btn" type="button" @click="add">Add one</button>
      <button id="remove" class="btn" type="button" @click="remove">Remove one</button>
      <button id="layout" class="btn btn--ghost" type="button" @click="layout">Switch layout (view transition)</button>
    </div>
    <TransitionGroup tag="ul" name="tile" :css="!reduceMotion && !switching" id="tiles" :class="['tiles', grid ? 'tiles--grid' : 'tiles--list']" aria-label="Tiles">
      <li v-for="t in tiles" :key="t.id" class="tile" :data-id="t.id" :style="{ background: `hsl(${t.hue} 70% 55%)`, viewTransitionName: `tile-${t.id}` }">{{ t.id }}</li>
    </TransitionGroup>
    <h2>Throw it</h2>
    <p class="muted">Drag the card and let go: it springs back with the velocity you gave it. Arrow keys nudge it; Escape releases it.</p>
    <div class="drag-area">
      <div id="drag-card" ref="card" :class="['drag-card', { 'is-dragging': dragging }]" tabindex="0" role="button" aria-label="Draggable card"
        @pointerdown="down" @pointermove="move" @pointerup="release" @pointercancel="release" @keydown="key">Drag me</div>
    </div>
  </Layout>
</template>

<style>
.tile-move { transition: transform 350ms cubic-bezier(0.2, 0.7, 0.2, 1); }
.tile-enter-active { transition: opacity 250ms ease-out, transform 250ms ease-out; }
.tile-leave-active { transition: opacity 200ms ease-in, transform 200ms ease-in; position: absolute; }
.tile-enter-from, .tile-leave-to { opacity: 0; transform: scale(0.6); }
</style>
