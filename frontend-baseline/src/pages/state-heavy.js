import './state-heavy.css';
import { h, mount, uid } from '../lib/dom.js';
import { createStore, withHistory } from '../lib/store.js';
import { toast } from '../lib/toast.js';

const COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];
const STORAGE_KEY = 'board:v1';
const card = (title, column) => ({ id: uid('card'), title, column, createdAt: Date.now() });
const seed = () => ({
  cards: [
    card('Port the contact form to React', 'todo'),
    card('Measure board render time in Svelte', 'todo'),
    card('Decide between hash and history routing', 'doing'),
    card('Write docs/astro.md', 'doing'),
    card('Generate gallery images', 'done'),
    card('Set up the Vite multi-page build', 'done'),
  ],
});

// Domain state: persisted, with undo history. UI state: transient, no history.
const store = withHistory(createStore(seed(), { persistKey: STORAGE_KEY }));
const ui = createStore({ filter: '' });

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const newForm = $('new-card-form');
const newInput = $('new-card-title');
const filterInput = $('filter');
const undoButton = $('undo');
const redoButton = $('redo');
const dialog = $('edit-dialog');
const editTitle = $('edit-title');
const editColumn = $('edit-column');

// --- actions: the only code that writes to the store (immutable updates) ---
const actions = {
  add: (title) => store.set((s) => ({ ...s, cards: [...s.cards, card(title, 'todo')] })),
  update: (id, patch) => store.set((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  remove: (id) => store.set((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) })),
  move: (id, column, beforeId = null) =>
    store.set((s) => {
      const moving = s.cards.find((c) => c.id === id);
      if (!moving || beforeId === id) return s;
      const rest = s.cards.filter((c) => c.id !== id);
      const moved = { ...moving, column };
      const index = beforeId ? rest.findIndex((c) => c.id === beforeId) : -1;
      if (index < 0) rest.push(moved);
      else rest.splice(index, 0, moved);
      return { ...s, cards: rest };
    }),
  stress: (n) =>
    store.set((s) => ({
      ...s,
      cards: [...s.cards, ...Array.from({ length: n }, (_, i) => card(`Generated card ${s.cards.length + i + 1}`, COLUMNS[i % 3].id))],
    })),
  reset: () => store.set(seed()),
};

// --- derived state ---
const visibleCards = (cards, filter) => {
  const needle = filter.trim().toLowerCase();
  return needle ? cards.filter((c) => c.title.toLowerCase().includes(needle)) : cards;
};

// --- render: deliberately naive. Every change rebuilds all columns, and we time it. ---
function render() {
  const t0 = performance.now();
  const { cards } = store.get();
  const shown = visibleCards(cards, ui.get().filter);
  mount(boardEl, COLUMNS.map((col) => column(col, shown.filter((c) => c.column === col.id))));
  void boardEl.offsetHeight; // force style + layout so the number includes what the browser has to do
  const ms = performance.now() - t0;

  const done = cards.filter((c) => c.column === 'done').length;
  $('stat-count').textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}${shown.length !== cards.length ? `, ${shown.length} shown` : ''}`;
  $('stat-done').textContent = `${done} done`;
  $('stat-render').textContent = `last render ${ms.toFixed(1)} ms`;
  $('progress-bar').style.width = cards.length ? `${(done / cards.length) * 100}%` : '0';
  undoButton.disabled = !store.canUndo;
  redoButton.disabled = !store.canRedo;
}
store.subscribe(render);
ui.subscribe(render);
render();

function column(col, cards) {
  return h('section', { class: 'column', 'aria-labelledby': `col-${col.id}` },
    h('header', { class: 'column__header' }, h('h2', { id: `col-${col.id}` }, col.title), h('span', { class: 'column__count' }, cards.length)),
    h('ul', { class: 'column__list', dataset: { column: col.id }, ondragover: onDragOver, ondragleave: onDragLeave, ondrop: onDrop },
      cards.length ? cards.map(cardItem) : h('li', { class: 'column__empty' }, 'Drop a card here'),
    ),
  );
}

function cardItem(c) {
  const li = h('li', {
    class: 'card-item', draggable: true, tabindex: 0, dataset: { id: c.id }, 'aria-label': c.title,
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; li.classList.add('is-dragging'); },
    ondragend: () => li.classList.remove('is-dragging'),
    ondblclick: () => edit(c),
    onkeydown: (e) => cardKeys(e, c),
  },
    h('span', { class: 'card-item__title' }, c.title),
    h('span', { class: 'card-item__actions' },
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-label': `Edit ${c.title}`, onclick: () => edit(c) }, 'Edit'),
      h('button', { class: 'btn btn--ghost btn--sm btn--danger', type: 'button', 'aria-label': `Delete ${c.title}`, onclick: () => actions.remove(c.id) }, 'Delete'),
    ),
  );
  return li;
}

// --- drag and drop (native) ---
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('is-over');
}
function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('is-over');
}
function onDrop(e) {
  e.preventDefault();
  const list = e.currentTarget;
  list.classList.remove('is-over');
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;
  const before = [...list.querySelectorAll('[data-id]')].find((li) => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
  actions.move(id, list.dataset.column, before?.dataset.id ?? null);
}

// --- keyboard ---
function cardKeys(e, c) {
  const i = COLUMNS.findIndex((col) => col.id === c.column);
  if (e.key === '[' && i > 0) { actions.move(c.id, COLUMNS[i - 1].id); focusCard(c.id); }
  else if (e.key === ']' && i < COLUMNS.length - 1) { actions.move(c.id, COLUMNS[i + 1].id); focusCard(c.id); }
  else if (e.key === 'Enter') edit(c);
  else if (e.key === 'Delete' || e.key === 'Backspace') actions.remove(c.id);
  else return;
  e.preventDefault();
}
// Naive rendering throws the focused node away on every change, so focus is restored by id afterwards.
// Keyed reconciliation in frameworks avoids this whole class of problem.
const focusCard = (id) => boardEl.querySelector(`[data-id="${id}"]`)?.focus();

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (typing || dialog.open) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
  else if (e.key === 'n') { e.preventDefault(); newInput.focus(); }
  else if (e.key === '/') { e.preventDefault(); filterInput.focus(); }
});

// --- edit dialog: edits live in the dialog, so re-renders cannot wipe in-progress input ---
let editing = null;
function edit(c) {
  editing = c.id;
  editTitle.value = c.title;
  editColumn.value = c.column;
  dialog.showModal();
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'save' && editing) {
    const title = editTitle.value.trim();
    if (title) actions.update(editing, { title, column: editColumn.value });
    focusCard(editing);
  }
  editing = null;
});

// --- toolbar ---
newForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = newInput.value.trim();
  if (!title) return;
  actions.add(title);
  newInput.value = '';
});
filterInput.addEventListener('input', () => ui.set({ filter: filterInput.value }));
undoButton.addEventListener('click', () => store.undo());
redoButton.addEventListener('click', () => store.redo());
$('stress').addEventListener('click', () => { actions.stress(300); toast('Added 300 cards'); });
$('reset').addEventListener('click', () => { if (confirm('Reset the board to its six starter cards?')) actions.reset(); });

// --- cross-tab sync: another tab wrote to localStorage ---
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    store.replace(JSON.parse(e.newValue));
    toast('Board updated in another tab');
  }
});
