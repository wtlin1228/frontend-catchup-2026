<script>
  import { untrack } from 'svelte';
  import Layout from './Layout.svelte';
  import { COLUMNS, sortFilter } from '@baseline/src/lib/rows.js';
  import '@baseline/src/pages/table.css';

  const ROW_H = 36;
  const OVERSCAN = 8;
  const KEYS = { ArrowDown: (a) => a + 1, ArrowUp: (a) => a - 1, PageDown: (a, page) => a + page, PageUp: (a, page) => a - page, Home: () => 0, End: (a, page, max) => max };
  // The rows and the order are large and immutable: raw state, replaced as a whole. The DOM only ever holds the window.
  let rows = $state.raw([]);
  let order = $state.raw(new Uint32Array(0));
  let sort = $state('id');
  let dir = $state(1);
  let filter = $state('');
  let compute = $state('worker');
  let selected = $state.raw(new Set());
  let active = $state(0);
  let top = $state(0);
  let height = $state(0);
  let viewport = $state(null);
  let container = $state(null);
  let status = $state(null);
  let queryId = 0, anchor = -1, raf = 0, timer = 0, t0 = 0, last = { ms: 0, where: '' };

  const worker = new Worker(new URL('./table-heavy/worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'data') { rows = data.rows; order = new Uint32Array(0); }
    else if (data.type === 'order' && data.id === queryId) applyOrder(data.order, data.ms, 'worker');
  };
  function load(count) {
    status.textContent = `Generating ${count.toLocaleString()} rows…`;
    selected = new Set();
    active = 0;
    worker.postMessage({ type: 'generate', count });
  }
  function applyOrder(next, ms, where) {
    t0 = performance.now();
    last = { ms, where };
    order = next;
    active = Math.min(active, Math.max(0, next.length - 1));
  }
  // The query follows the state it reads; untrack keeps what applyOrder writes (and reads) out of the dependencies.
  $effect(() => {
    const params = { filter, sort, dir };
    const data = rows;
    const where = compute;
    if (!data.length) return;
    untrack(() => {
      if (where === 'main') { const started = performance.now(); applyOrder(sortFilter(data, params), performance.now() - started, 'main thread'); }
      else worker.postMessage({ type: 'query', id: ++queryId, ...params });
    });
  });
  // The window is a derived slice of the order, following the scroll position and the viewport size.
  const first = $derived(Math.max(0, Math.floor(top / ROW_H) - OVERSCAN));
  const inView = $derived.by(() => {
    const end = Math.min(order.length, first + Math.ceil(height / ROW_H) + OVERSCAN * 2);
    const out = [];
    for (let pos = first; pos < end; pos++) { const index = order[pos]; if (rows[index]) out.push({ pos, index, row: rows[index] }); }
    return out;
  });
  // After the DOM shows a new order: force layout and report, as the baseline does right after its render.
  $effect(() => {
    void inView;
    if (!t0) return;
    void container.offsetHeight;
    status.textContent = `${order.length.toLocaleString()} of ${rows.length.toLocaleString()} rows, sorted and filtered in ${last.ms.toFixed(1)} ms on the ${last.where}, rendered in ${(performance.now() - t0).toFixed(1)} ms`;
    t0 = 0;
  });
  const measureView = () => { top = viewport.scrollTop; height = viewport.clientHeight; };
  $effect(() => {
    const ro = new ResizeObserver(measureView);
    ro.observe(viewport);
    load(50000);
    return () => { ro.disconnect(); worker.terminate(); };
  });
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measureView(); }); };
  const onFilter = (e) => { clearTimeout(timer); const value = e.target.value; timer = setTimeout(() => (filter = value), 150); };

  const toggle = (set, index) => { const next = new Set(set); if (next.has(index)) next.delete(index); else next.add(index); return next; };
  function onClick(e) {
    const rowEl = e.target.closest('.grid-row[data-index]');
    if (!rowEl) return;
    const index = Number(rowEl.dataset.index);
    const pos = Number(rowEl.dataset.pos);
    if (e.shiftKey && anchor >= 0) {
      const [from, to] = [anchor, pos].sort((a, b) => a - b);
      const next = new Set(selected);
      for (let p = from; p <= to; p++) next.add(order[p]);
      selected = next;
    } else { selected = toggle(selected, index); anchor = pos; }
    active = pos;
  }
  function onKeyDown(e) {
    const max = order.length - 1;
    const page = Math.floor(viewport.clientHeight / ROW_H);
    let next = active;
    if (e.key === ' ') { selected = toggle(selected, order[active]); anchor = active; }
    else if (KEYS[e.key]) next = Math.max(0, Math.min(max, KEYS[e.key](active, page, max)));
    else return;
    e.preventDefault();
    active = next;
    const rowTop = next * ROW_H;
    if (rowTop < viewport.scrollTop + ROW_H) viewport.scrollTop = rowTop - ROW_H;
    else if (rowTop + ROW_H > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = rowTop + ROW_H * 2 - viewport.clientHeight;
  }
  function exportCsv() {
    const lines = [COLUMNS.map((c) => c.label).join(',')];
    for (const i of order) lines.push(COLUMNS.map((c) => JSON.stringify(String(rows[i][c.key]))).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'rows.csv' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<Layout pattern="table" variant="heavy">
  {#snippet header()}
    <h1>Grid</h1>
    <p>Rows are generated in a Web Worker. Only the rows in view exist in the DOM: the window is a derived slice of the order, keyed by position, so scrolling rewrites cells instead of creating elements. Sorting and filtering run in the worker or, for comparison, on the main thread. Rows can be selected with the mouse or keyboard and exported as CSV.</p>
  {/snippet}
  <div class="grid-toolbar">
    <label>Rows
      <select id="rows" class="select" onchange={(e) => load(Number(e.target.value))}>
        <option value="1000">1,000</option><option value="50000" selected>50,000</option><option value="200000">200,000</option>
      </select>
    </label>
    <label for="filter" class="visually-hidden">Filter rows</label>
    <input id="filter" class="input" type="search" placeholder="Filter by name, team or status" style="max-width: 18rem" autocomplete="off" oninput={onFilter} />
    <fieldset>
      <legend>Sort and filter on</legend>
      <label><input type="radio" name="compute" value="worker" bind:group={compute} /> Worker</label>
      <label><input type="radio" name="compute" value="main" bind:group={compute} /> Main thread</label>
    </fieldset>
    <button id="export" class="btn" type="button" onclick={exportCsv}>Export CSV</button>
    <span id="status" bind:this={status} class="muted" aria-live="polite"></span>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div id="viewport" bind:this={viewport} class="grid-viewport" tabindex="0" role="grid" aria-label="Rows" aria-rowcount={order.length} aria-multiselectable="true" onscroll={onScroll} onclick={onClick} onkeydown={onKeyDown}>
    <div class="grid-row grid-row--head" role="row" id="head">
      {#each COLUMNS as c (c.key)}
        <div class="grid-cell{c.numeric ? ' num' : ''}" role="columnheader" aria-sort={sort === c.key ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
          <button type="button" onclick={() => { dir = sort === c.key ? -dir : 1; sort = c.key; }}>{c.label}</button>
        </div>
      {/each}
    </div>
    <div id="spacer" class="grid-spacer" style="height: {order.length * ROW_H}px">
      <div id="rows-container" bind:this={container} class="grid-rows" style="transform: translateY({first * ROW_H}px)">
        {#each inView as { pos, index, row } (pos)}
          <div class="grid-row{selected.has(index) ? ' is-selected' : ''}{pos === active ? ' is-active' : ''}" role="row" aria-rowindex={pos + 1} aria-selected={selected.has(index)} data-index={index} data-pos={pos}>
            {#each COLUMNS as c (c.key)}<div class="grid-cell{c.numeric ? ' num' : ''}" role="gridcell">{String(row[c.key])}</div>{/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
  <p id="selection" class="muted" style="margin-top: var(--space-3)">{selected.size ? `${selected.size.toLocaleString()} row${selected.size === 1 ? '' : 's'} selected.` : 'No rows selected. Click selects, shift-click extends, arrow keys move, space toggles.'}</p>
</Layout>
