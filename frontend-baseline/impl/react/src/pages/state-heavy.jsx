import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import { toast } from '@baseline/src/lib/toast.js';
import '@baseline/src/pages/state-heavy.css';

const COLUMNS = [{ id: 'todo', title: 'To do' }, { id: 'doing', title: 'In progress' }, { id: 'done', title: 'Done' }];
const STORAGE_KEY = 'board:v1';
const uid = () => `card_${Math.random().toString(36).slice(2, 9)}`;
const card = (title, column) => ({ id: uid(), title, column, createdAt: Date.now() });
const seed = () => ({
  cards: [
    card('Port the contact form to React', 'todo'), card('Measure board render time in Svelte', 'todo'),
    card('Decide between hash and history routing', 'doing'), card('Write docs/astro.md', 'doing'),
    card('Generate gallery images', 'done'), card('Set up the Vite multi-page build', 'done'),
  ],
});
const load = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...seed(), ...JSON.parse(raw) } : seed(); } catch { return seed(); } };

// --- domain reducer with history: what store.js + withHistory were in the baseline ---
function cards(state, action) {
  switch (action.type) {
    case 'add': return { ...state, cards: [...state.cards, card(action.title, 'todo')] };
    case 'update': return { ...state, cards: state.cards.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case 'remove': return { ...state, cards: state.cards.filter((c) => c.id !== action.id) };
    case 'move': {
      const moving = state.cards.find((c) => c.id === action.id);
      if (!moving || action.beforeId === action.id) return state;
      const rest = state.cards.filter((c) => c.id !== action.id);
      const moved = { ...moving, column: action.column };
      const index = action.beforeId ? rest.findIndex((c) => c.id === action.beforeId) : -1;
      if (index < 0) rest.push(moved); else rest.splice(index, 0, moved);
      return { ...state, cards: rest };
    }
    case 'stress': return { ...state, cards: [...state.cards, ...Array.from({ length: action.n }, (_, i) => card(`Generated card ${state.cards.length + i + 1}`, COLUMNS[i % 3].id))] };
    case 'reset': return seed();
    default: return state;
  }
}
function history(h, action) {
  if (action.type === 'undo') return h.past.length ? { past: h.past.slice(0, -1), present: h.past.at(-1), future: [h.present, ...h.future] } : h;
  if (action.type === 'redo') return h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h;
  if (action.type === 'replace') return { ...h, present: action.state }; // external sync bypasses history
  const present = cards(h.present, action);
  if (present === h.present) return h;
  return { past: [...h.past, h.present].slice(-100), present, future: [] };
}

function Board() {
  const [{ past, present, future }, rawDispatch] = useReducer(history, undefined, () => ({ past: [], present: load(), future: [] }));
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const boardRef = useRef(null);
  const statRef = useRef(null);
  const dialogRef = useRef(null);
  const newInput = useRef(null);
  const filterInput = useRef(null);
  const t0 = useRef(0);
  const focusAfter = useRef(null);

  // Timed render: from dispatch to the committed DOM, including style and layout, like the baseline.
  const dispatch = (action) => { t0.current = performance.now(); rawDispatch(action); };
  useLayoutEffect(() => {
    if (!t0.current) return;
    void boardRef.current.offsetHeight;
    statRef.current.textContent = `last render ${(performance.now() - t0.current).toFixed(1)} ms`;
    t0.current = 0;
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(present)); }, [present]);
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY && e.newValue) { rawDispatch({ type: 'replace', state: JSON.parse(e.newValue) }); toast('Board updated in another tab'); } };
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (typing || dialogRef.current?.open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }); }
      else if (e.key === 'n') { e.preventDefault(); newInput.current.focus(); }
      else if (e.key === '/') { e.preventDefault(); filterInput.current.focus(); }
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('storage', onStorage); document.removeEventListener('keydown', onKey); };
  }, []);
  // Keyed reconciliation keeps a moved card's element, but moving a node still drops focus: restore it by id.
  useEffect(() => { if (focusAfter.current) { boardRef.current.querySelector(`[data-id="${focusAfter.current}"]`)?.focus(); focusAfter.current = null; } });

  const needle = filter.trim().toLowerCase();
  const shown = needle ? present.cards.filter((c) => c.title.toLowerCase().includes(needle)) : present.cards;
  const done = present.cards.filter((c) => c.column === 'done').length;

  const edit = (c) => { setEditing(c); dialogRef.current.showModal(); };
  const onDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog.returnValue === 'save' && editing) {
      const title = dialog.querySelector('#edit-title').value.trim();
      if (title) dispatch({ type: 'update', id: editing.id, patch: { title, column: dialog.querySelector('#edit-column').value } });
      focusAfter.current = editing.id;
    }
    setEditing(null);
  };
  const cardKeys = (e, c) => {
    const i = COLUMNS.findIndex((col) => col.id === c.column);
    if (e.key === '[' && i > 0) { dispatch({ type: 'move', id: c.id, column: COLUMNS[i - 1].id }); focusAfter.current = c.id; }
    else if (e.key === ']' && i < COLUMNS.length - 1) { dispatch({ type: 'move', id: c.id, column: COLUMNS[i + 1].id }); focusAfter.current = c.id; }
    else if (e.key === 'Enter') edit(c);
    else if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'remove', id: c.id });
    else return;
    e.preventDefault();
  };
  const onDrop = (e, column) => {
    e.preventDefault();
    e.currentTarget.classList.remove('is-over');
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const before = [...e.currentTarget.querySelectorAll('[data-id]')].find((li) => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
    dispatch({ type: 'move', id, column, beforeId: before?.dataset.id ?? null });
  };

  return (
    <>
      <div className="board-toolbar">
        <form id="new-card-form" className="cluster" onSubmit={(e) => { e.preventDefault(); const title = newInput.current.value.trim(); if (!title) return; dispatch({ type: 'add', title }); newInput.current.value = ''; }}>
          <label htmlFor="new-card-title" className="visually-hidden">New card title</label>
          <input id="new-card-title" ref={newInput} className="input" placeholder="Add a card (press n)" required maxLength={80} autoComplete="off" />
          <button className="btn btn--primary" type="submit">Add card</button>
        </form>
        <label className="board-filter">
          <span className="visually-hidden">Filter cards</span>
          <input id="filter" ref={filterInput} className="input" type="search" placeholder="Filter (press /)" value={filter} onChange={(e) => { t0.current = performance.now(); setFilter(e.target.value); }} />
        </label>
        <div className="cluster">
          <button id="undo" className="btn" type="button" disabled={!past.length} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
          <button id="redo" className="btn" type="button" disabled={!future.length} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
          <button id="stress" className="btn btn--ghost" type="button" onClick={() => { dispatch({ type: 'stress', n: 300 }); toast('Added 300 cards'); }}>Add 300 cards</button>
          <button id="reset" className="btn btn--ghost btn--danger" type="button" onClick={() => { if (confirm('Reset the board to its six starter cards?')) dispatch({ type: 'reset' }); }}>Reset board</button>
        </div>
      </div>
      <p className="board-stats muted">
        <span id="stat-count">{present.cards.length} card{present.cards.length === 1 ? '' : 's'}{shown.length !== present.cards.length ? `, ${shown.length} shown` : ''}</span>
        <span id="stat-done">{done} done</span>
        <span id="stat-render" ref={statRef} title="Time from dispatch to the committed DOM after the last change">last render 0 ms</span>
      </p>
      <div className="progress" aria-hidden="true"><div id="progress-bar" className="progress__bar" style={{ width: present.cards.length ? `${(done / present.cards.length) * 100}%` : 0 }} /></div>
      <div id="board" ref={boardRef} className="board" aria-label="Kanban board">
        {COLUMNS.map((col) => {
          const inColumn = shown.filter((c) => c.column === col.id);
          return (
            <section key={col.id} className="column" aria-labelledby={`col-${col.id}`}>
              <header className="column__header"><h2 id={`col-${col.id}`}>{col.title}</h2><span className="column__count">{inColumn.length}</span></header>
              <ul className="column__list" data-column={col.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('is-over'); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('is-over'); }}
                onDrop={(e) => onDrop(e, col.id)}>
                {inColumn.length ? inColumn.map((c) => (
                  <li key={c.id} className="card-item" draggable tabIndex={0} data-id={c.id} aria-label={c.title}
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('is-dragging'); }}
                    onDragEnd={(e) => e.currentTarget.classList.remove('is-dragging')}
                    onDoubleClick={() => edit(c)} onKeyDown={(e) => cardKeys(e, c)}>
                    <span className="card-item__title">{c.title}</span>
                    <span className="card-item__actions">
                      <button className="btn btn--ghost btn--sm" type="button" aria-label={`Edit ${c.title}`} onClick={() => edit(c)}>Edit</button>
                      <button className="btn btn--ghost btn--sm btn--danger" type="button" aria-label={`Delete ${c.title}`} onClick={() => dispatch({ type: 'remove', id: c.id })}>Delete</button>
                    </span>
                  </li>
                )) : <li className="column__empty">Drop a card here</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <details className="board-help">
        <summary>Keyboard shortcuts</summary>
        <ul>
          <li><kbd>n</kbd> new card, <kbd>/</kbd> filter</li>
          <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undo, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo</li>
          <li>With a card focused: <kbd>[</kbd> and <kbd>]</kbd> move it between columns, <kbd>Enter</kbd> edits, <kbd>Delete</kbd> removes</li>
        </ul>
      </details>
      <dialog id="edit-dialog" ref={dialogRef} onClose={onDialogClose}>
        <form method="dialog" className="dialog__body" id="edit-form">
          <h2>Edit card</h2>
          <div className="field">
            <label htmlFor="edit-title">Title</label>
            <input id="edit-title" className="input" required maxLength={80} defaultValue={editing?.title ?? ''} key={editing?.id ?? 'none'} />
          </div>
          <div className="field">
            <label htmlFor="edit-column">Column</label>
            <select id="edit-column" className="select" defaultValue={editing?.column ?? 'todo'} key={`col-${editing?.id ?? 'none'}`}>
              {COLUMNS.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
            </select>
          </div>
          <div className="dialog__actions">
            <button className="btn" value="cancel" formNoValidate>Cancel</button>
            <button className="btn btn--primary" value="save">Save</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

mount(
  <Layout pattern="state" variant="heavy">
    <>
      <h1>Board</h1>
      <p>One reducer with undo and redo, derived counts, persistence with cross-tab sync, native drag and drop. React re-renders the columns from state on every change and reconciles them by key; the time from dispatch to the committed DOM is shown. Press "Add 300 cards" and compare with the baseline's naive rebuild.</p>
    </>
    <Board />
  </Layout>,
);
