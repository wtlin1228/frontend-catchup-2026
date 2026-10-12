<script>
  import Layout from './Layout.svelte';
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

  // Domain state as immutable snapshots ($state.raw: reassigned, never mutated) so history is a list of them.
  let present = $state.raw(load());
  let past = $state.raw([]);
  let future = $state.raw([]);
  let filter = $state('');
  let editing = $state(null);
  let board, stat, dialog, newInput, filterInput;
  let t0 = 0;
  let focusAfter = null;

  function reduce(state, action) {
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
  function dispatch(action) {
    t0 = performance.now();
    if (action.type === 'undo') { if (!past.length) return; future = [present, ...future]; present = past.at(-1); past = past.slice(0, -1); return; }
    if (action.type === 'redo') { if (!future.length) return; past = [...past, present]; present = future[0]; future = future.slice(1); return; }
    const next = reduce(present, action);
    if (next === present) return;
    past = [...past, present].slice(-100);
    present = next;
    future = [];
  }

  const needle = $derived(filter.trim().toLowerCase());
  const shown = $derived(needle ? present.cards.filter((c) => c.title.toLowerCase().includes(needle)) : present.cards);
  const done = $derived(present.cards.filter((c) => c.column === 'done').length);

  // Effects run after the DOM is updated: time the render (forcing layout, like the baseline) and restore focus.
  $effect(() => {
    shown;
    if (t0) { void board.offsetHeight; stat.textContent = `last render ${(performance.now() - t0).toFixed(1)} ms`; t0 = 0; }
    if (focusAfter) { board.querySelector(`[data-id="${focusAfter}"]`)?.focus(); focusAfter = null; }
  });
  $effect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(present)); });

  function onStorage(e) { if (e.key === STORAGE_KEY && e.newValue) { present = JSON.parse(e.newValue); toast('Board updated in another tab'); } }
  function onKey(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing || dialog?.open) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }); }
    else if (e.key === 'n') { e.preventDefault(); newInput.focus(); }
    else if (e.key === '/') { e.preventDefault(); filterInput.focus(); }
  }
  function cardKeys(e, c) {
    const i = COLUMNS.findIndex((col) => col.id === c.column);
    if (e.key === '[' && i > 0) { focusAfter = c.id; dispatch({ type: 'move', id: c.id, column: COLUMNS[i - 1].id }); }
    else if (e.key === ']' && i < COLUMNS.length - 1) { focusAfter = c.id; dispatch({ type: 'move', id: c.id, column: COLUMNS[i + 1].id }); }
    else if (e.key === 'Enter') edit(c);
    else if (e.key === 'Delete' || e.key === 'Backspace') dispatch({ type: 'remove', id: c.id });
    else return;
    e.preventDefault();
  }
  function edit(c) { editing = c; dialog.showModal(); }
  function onDialogClose() {
    if (dialog.returnValue === 'save' && editing) {
      const title = dialog.querySelector('#edit-title').value.trim();
      if (title) { focusAfter = editing.id; dispatch({ type: 'update', id: editing.id, patch: { title, column: dialog.querySelector('#edit-column').value } }); }
    }
    editing = null;
  }
  function onDrop(e, column) {
    e.preventDefault();
    e.currentTarget.classList.remove('is-over');
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const before = [...e.currentTarget.querySelectorAll('[data-id]')].find((li) => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
    dispatch({ type: 'move', id, column, beforeId: before?.dataset.id ?? null });
  }
  function submitNew(e) {
    e.preventDefault();
    const title = newInput.value.trim();
    if (!title) return;
    dispatch({ type: 'add', title });
    newInput.value = '';
  }
</script>

<svelte:window onstorage={onStorage} onkeydown={onKey} />

<Layout pattern="state" variant="heavy">
  {#snippet header()}
    <h1>Board</h1>
    <p>One reducer over immutable snapshots with undo and redo, derived counts, persistence with cross-tab sync, native drag and drop. The compiler updates the columns from state; keyed <code>each</code> blocks keep card elements across moves; the time from dispatch to the updated DOM is shown. Press "Add 300 cards" and compare with the baseline's naive rebuild.</p>
  {/snippet}
  <div class="board-toolbar">
    <form id="new-card-form" class="cluster" onsubmit={submitNew}>
      <label for="new-card-title" class="visually-hidden">New card title</label>
      <input id="new-card-title" bind:this={newInput} class="input" placeholder="Add a card (press n)" required maxlength="80" autocomplete="off" />
      <button class="btn btn--primary" type="submit">Add card</button>
    </form>
    <label class="board-filter">
      <span class="visually-hidden">Filter cards</span>
      <input id="filter" bind:this={filterInput} class="input" type="search" placeholder="Filter (press /)" bind:value={filter} oninput={() => (t0 = performance.now())} />
    </label>
    <div class="cluster">
      <button id="undo" class="btn" type="button" disabled={!past.length} onclick={() => dispatch({ type: 'undo' })}>Undo</button>
      <button id="redo" class="btn" type="button" disabled={!future.length} onclick={() => dispatch({ type: 'redo' })}>Redo</button>
      <button id="stress" class="btn btn--ghost" type="button" onclick={() => { dispatch({ type: 'stress', n: 300 }); toast('Added 300 cards'); }}>Add 300 cards</button>
      <button id="reset" class="btn btn--ghost btn--danger" type="button" onclick={() => { if (confirm('Reset the board to its six starter cards?')) dispatch({ type: 'reset' }); }}>Reset board</button>
    </div>
  </div>
  <p class="board-stats muted">
    <span id="stat-count">{present.cards.length} card{present.cards.length === 1 ? '' : 's'}{shown.length !== present.cards.length ? `, ${shown.length} shown` : ''}</span>
    <span id="stat-done">{done} done</span>
    <span id="stat-render" bind:this={stat} title="Time from dispatch to the updated DOM after the last change">last render 0 ms</span>
  </p>
  <div class="progress" aria-hidden="true"><div id="progress-bar" class="progress__bar" style="width: {present.cards.length ? `${(done / present.cards.length) * 100}%` : 0}"></div></div>
  <div id="board" bind:this={board} class="board" aria-label="Kanban board">
    {#each COLUMNS as col (col.id)}
      {@const inColumn = shown.filter((c) => c.column === col.id)}
      <section class="column" aria-labelledby="col-{col.id}">
        <header class="column__header"><h2 id="col-{col.id}">{col.title}</h2><span class="column__count">{inColumn.length}</span></header>
        <ul class="column__list" data-column={col.id}
          ondragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('is-over'); }}
          ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('is-over'); }}
          ondrop={(e) => onDrop(e, col.id)}>
          {#each inColumn as c (c.id)}
            <li class="card-item" draggable="true" tabindex="0" data-id={c.id} aria-label={c.title}
              ondragstart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('is-dragging'); }}
              ondragend={(e) => e.currentTarget.classList.remove('is-dragging')}
              ondblclick={() => edit(c)} onkeydown={(e) => cardKeys(e, c)}>
              <span class="card-item__title">{c.title}</span>
              <span class="card-item__actions">
                <button class="btn btn--ghost btn--sm" type="button" aria-label="Edit {c.title}" onclick={() => edit(c)}>Edit</button>
                <button class="btn btn--ghost btn--sm btn--danger" type="button" aria-label="Delete {c.title}" onclick={() => dispatch({ type: 'remove', id: c.id })}>Delete</button>
              </span>
            </li>
          {:else}
            <li class="column__empty">Drop a card here</li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
  <details class="board-help">
    <summary>Keyboard shortcuts</summary>
    <ul>
      <li><kbd>n</kbd> new card, <kbd>/</kbd> filter</li>
      <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undo, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo</li>
      <li>With a card focused: <kbd>[</kbd> and <kbd>]</kbd> move it between columns, <kbd>Enter</kbd> edits, <kbd>Delete</kbd> removes</li>
    </ul>
  </details>
  <dialog id="edit-dialog" bind:this={dialog} onclose={onDialogClose}>
    <form method="dialog" class="dialog__body" id="edit-form">
      <h2>Edit card</h2>
      {#key editing?.id}
        <div class="field">
          <label for="edit-title">Title</label>
          <input id="edit-title" class="input" required maxlength="80" value={editing?.title ?? ''} />
        </div>
        <div class="field">
          <label for="edit-column">Column</label>
          <select id="edit-column" class="select" value={editing?.column ?? 'todo'}>
            {#each COLUMNS as col (col.id)}<option value={col.id}>{col.title}</option>{/each}
          </select>
        </div>
      {/key}
      <div class="dialog__actions">
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
        <button class="btn btn--primary" value="save">Save</button>
      </div>
    </form>
  </dialog>
</Layout>
