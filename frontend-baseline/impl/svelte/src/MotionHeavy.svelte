<script>
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';
  import { Spring, prefersReducedMotion } from 'svelte/motion';
  import Layout from './Layout.svelte';
  import '@baseline/src/pages/motion-heavy.css';

  // Tiles: a keyed each block with animate:flip for moves and scale transitions for enter and leave. The baseline's
  // FLIP and WAAPI code is the compiler's job here; only the layout switch still calls the View Transitions API.
  let tiles = $state(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, hue: (i * 137) % 360 })));
  let grid = $state(true);
  let nextId = 13;
  const ms = (n) => (prefersReducedMotion.current ? 0 : n);
  const shuffle = () => { const a = [...tiles]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } tiles = a; };
  const sort = () => { tiles = [...tiles].sort((a, b) => a.id - b.id); };
  const add = () => { const a = [...tiles]; a.splice(Math.floor(Math.random() * (a.length + 1)), 0, { id: nextId, hue: (nextId * 137) % 360 }); nextId++; tiles = a; };
  const remove = () => { if (!tiles.length) return; const victim = tiles[Math.floor(Math.random() * tiles.length)].id; tiles = tiles.filter((t) => t.id !== victim); };
  function layout() {
    const swap = async () => { grid = !grid; await tick(); }; // the DOM must change inside the callback, after Svelte flushes
    if (document.startViewTransition && !prefersReducedMotion.current) document.startViewTransition(swap);
    else swap();
  }

  // The card: a Spring from svelte/motion. It follows the pointer while dragging and is flung back with its momentum on release.
  const spring = new Spring({ x: 0, y: 0 }, { stiffness: 0.12, damping: 0.5 });
  let dragging = $state(false);
  let last = null;
  function down(e) { dragging = true; e.currentTarget.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; spring.stiffness = 0.4; }
  function move(e) {
    if (!dragging) return;
    spring.target = { x: spring.target.x + e.clientX - last.x, y: spring.target.y + e.clientY - last.y };
    last = { x: e.clientX, y: e.clientY };
  }
  function release() {
    if (!dragging) return;
    dragging = false;
    spring.stiffness = 0.12;
    spring.set({ x: 0, y: 0 }, { instant: prefersReducedMotion.current, preserveMomentum: 120 });
  }
  function key(e) {
    const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
    if (step) spring.set({ x: spring.target.x + step[0], y: spring.target.y + step[1] }, { instant: true });
    else if (e.key === 'Escape') spring.set({ x: 0, y: 0 }, { instant: prefersReducedMotion.current });
    else return;
    e.preventDefault();
  }
</script>

<Layout pattern="motion" variant="heavy">
  {#snippet header()}
    <h1>Scripted motion</h1>
    <p>The baseline's motion page in Svelte 5: <code>animate:flip</code> and <code>transition:scale</code> on the keyed list replace the FLIP and WAAPI code, a <code>Spring</code> from <code>svelte/motion</code> replaces the hand-written integrator, and the layout switch still calls the View Transitions API around a state change.</p>
  {/snippet}
  <h2>Reorder, add, remove</h2>
  <div class="cluster" style="margin-bottom: var(--space-4)">
    <button id="shuffle" class="btn" type="button" onclick={shuffle}>Shuffle</button>
    <button id="sort" class="btn" type="button" onclick={sort}>Sort</button>
    <button id="add" class="btn" type="button" onclick={add}>Add one</button>
    <button id="remove" class="btn" type="button" onclick={remove}>Remove one</button>
    <button id="layout" class="btn btn--ghost" type="button" onclick={layout}>Switch layout (view transition)</button>
  </div>
  <ul id="tiles" class="tiles {grid ? 'tiles--grid' : 'tiles--list'}" aria-label="Tiles">
    {#each tiles as t (t.id)}
      <li class="tile" data-id={t.id} style="background: hsl({t.hue} 70% 55%); view-transition-name: tile-{t.id}"
        animate:flip={{ duration: ms(350) }} in:scale={{ duration: ms(250), start: 0.6 }} out:scale={{ duration: ms(200), start: 0.6 }}>{t.id}</li>
    {/each}
  </ul>
  <h2>Throw it</h2>
  <p class="muted">Drag the card and let go: it springs back with the velocity you gave it. Arrow keys nudge it; Escape releases it.</p>
  <div class="drag-area">
    <div id="drag-card" class="drag-card" class:is-dragging={dragging} tabindex="0" role="button" aria-label="Draggable card"
      style="transform: translate({spring.current.x}px, {spring.current.y}px)"
      onpointerdown={down} onpointermove={move} onpointerup={release} onpointercancel={release} onkeydown={key}>Drag me</div>
  </div>
</Layout>
