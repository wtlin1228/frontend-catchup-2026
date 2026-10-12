import { ViewTransition, startTransition, useRef, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import '@baseline/src/pages/motion-heavy.css';
import '../motion-heavy/view-transitions.css';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seed = () => Array.from({ length: 12 }, (_, i) => ({ id: i + 1, hue: (i * 137) % 360 }));

// Tiles: every change is a Transition, and each tile sits in a <ViewTransition>, so the browser's View Transitions API
// animates reorders, the layout switch, enters and exits. The baseline's FLIP, WAAPI and startViewTransition code is gone.
function Tiles() {
  const [tiles, setTiles] = useState(seed);
  const [grid, setGrid] = useState(true);
  const nextId = useRef(13);
  // The next list is computed in the handler and handed to the Transition as a value: an updater function may run more
  // than once, so Math.random and the id counter must stay out of it.
  const update = (next) => startTransition(() => setTiles(next));
  const shuffle = () => { const a = [...tiles]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } update(a); };
  const sort = () => update([...tiles].sort((a, b) => a.id - b.id));
  const add = () => { const a = [...tiles]; const id = nextId.current++; a.splice(Math.floor(Math.random() * (a.length + 1)), 0, { id, hue: (id * 137) % 360 }); update(a); };
  const remove = () => { if (!tiles.length) return; const victim = tiles[Math.floor(Math.random() * tiles.length)].id; update(tiles.filter((t) => t.id !== victim)); };
  const layout = () => startTransition(() => setGrid((g) => !g));
  return (
    <>
      <div className="cluster" style={{ marginBottom: 'var(--space-4)' }}>
        <button id="shuffle" className="btn" type="button" onClick={shuffle}>Shuffle</button>
        <button id="sort" className="btn" type="button" onClick={sort}>Sort</button>
        <button id="add" className="btn" type="button" onClick={add}>Add one</button>
        <button id="remove" className="btn" type="button" onClick={remove}>Remove one</button>
        <button id="layout" className="btn btn--ghost" type="button" onClick={layout}>Switch layout (view transition)</button>
      </div>
      <ul id="tiles" className={`tiles ${grid ? 'tiles--grid' : 'tiles--list'}`} aria-label="Tiles">
        {tiles.map((t) => (
          // The tile's own class follows the layout so that a layout switch counts as an update of each tile and morphs it.
          <ViewTransition key={t.id} name={`tile-${t.id}`} enter="tile-enter" exit="tile-exit">
            <li className={`tile ${grid ? 'tile--cell' : 'tile--row'}`} data-id={t.id} style={{ background: `hsl(${t.hue} 70% 55%)` }}>{t.id}</li>
          </ViewTransition>
        ))}
      </ul>
    </>
  );
}

// The card: React has no spring; this is the baseline's pointer-capture drag and rAF spring, in refs, behind one state flag.
function DragCard() {
  const card = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const last = useRef(null);
  const raf = useRef(0);
  const [dragging, setDragging] = useState(false);
  const paint = () => { card.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`; };
  function spring() {
    if (reduceMotion) { pos.current = { x: 0, y: 0 }; paint(); return; }
    const step = () => {
      vel.current = { x: (vel.current.x - pos.current.x * 0.12) * 0.8, y: (vel.current.y - pos.current.y * 0.12) * 0.8 };
      pos.current = { x: pos.current.x + vel.current.x, y: pos.current.y + vel.current.y };
      paint();
      if (Math.abs(pos.current.x) + Math.abs(pos.current.y) + Math.abs(vel.current.x) + Math.abs(vel.current.y) > 0.5) raf.current = requestAnimationFrame(step);
      else { pos.current = { x: 0, y: 0 }; paint(); }
    };
    raf.current = requestAnimationFrame(step);
  }
  const down = (e) => { cancelAnimationFrame(raf.current); e.currentTarget.setPointerCapture(e.pointerId); last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }; setDragging(true); };
  const move = (e) => {
    if (!last.current) return;
    const dt = Math.max(1, e.timeStamp - last.current.t);
    vel.current = { x: ((e.clientX - last.current.x) / dt) * 16, y: ((e.clientY - last.current.y) / dt) * 16 };
    pos.current = { x: pos.current.x + e.clientX - last.current.x, y: pos.current.y + e.clientY - last.current.y };
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    paint();
  };
  const release = () => { if (!last.current) return; last.current = null; setDragging(false); spring(); };
  const key = (e) => {
    const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
    if (step) { cancelAnimationFrame(raf.current); pos.current = { x: pos.current.x + step[0], y: pos.current.y + step[1] }; paint(); }
    else if (e.key === 'Escape') spring();
    else return;
    e.preventDefault();
  };
  return (
    <div className="drag-area">
      <div id="drag-card" ref={card} className={`drag-card${dragging ? ' is-dragging' : ''}`} tabIndex={0} role="button" aria-label="Draggable card"
        onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onKeyDown={key}>Drag me</div>
    </div>
  );
}

mount(
  <Layout pattern="motion" variant="heavy">
    <>
      <h1>Scripted motion</h1>
      <p>The baseline's motion page in React 19.3: the tiles use the stable <code>&lt;ViewTransition&gt;</code> component, so reorders, enters, exits and the layout switch are one Transition each and the browser does the animating; the throwable card is still a hand-written spring, because React ships none.</p>
    </>
    <h2>Reorder, add, remove</h2>
    <Tiles />
    <h2>Throw it</h2>
    <p className="muted">Drag the card and let go: it springs back with the velocity you gave it. Arrow keys nudge it; Escape releases it.</p>
    <DragCard />
  </Layout>,
);
