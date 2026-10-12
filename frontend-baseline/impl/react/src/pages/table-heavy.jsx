import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import { COLUMNS, sortFilter } from '@baseline/src/lib/rows.js';
import '@baseline/src/pages/table.css';

const ROW_H = 36;
const OVERSCAN = 8;
const KEYS = { ArrowDown: (a) => a + 1, ArrowUp: (a) => a - 1, PageDown: (a, page) => a + page, PageUp: (a, page) => a - page, Home: () => 0, End: (a, page, max) => max };

function Grid() {
  // The rows and the order are large and immutable: plain state, replaced as a whole. The DOM only ever holds the window.
  const [rows, setRows] = useState([]);
  const [order, setOrder] = useState(() => new Uint32Array(0));
  const [sort, setSort] = useState({ key: 'id', dir: 1 });
  const [filter, setFilter] = useState('');
  const [compute, setCompute] = useState('worker');
  const [selected, setSelected] = useState(() => new Set());
  const [active, setActive] = useState(0);
  const [view, setView] = useState({ top: 0, height: 0 });
  const worker = useRef(null);
  const queryId = useRef(0);
  const anchor = useRef(-1);
  const raf = useRef(0);
  const timer = useRef(0);
  const t0 = useRef(0);
  const last = useRef({ ms: 0, where: '' });
  const viewport = useRef(null);
  const container = useRef(null);
  const status = useRef(null);

  // One worker for the component's life; StrictMode mounts twice in development, so the cleanup matters.
  useEffect(() => {
    const w = new Worker(new URL('../table-heavy/worker.js', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => {
      if (data.type === 'data') { setRows(data.rows); setOrder(new Uint32Array(0)); }
      else if (data.type === 'order' && data.id === queryId.current) applyOrder(data.order, data.ms, 'worker');
    };
    worker.current = w;
    load(50000);
    return () => w.terminate();
  }, []);
  function load(count) {
    status.current.textContent = `Generating ${count.toLocaleString()} rows…`;
    setSelected(new Set());
    setActive(0);
    worker.current.postMessage({ type: 'generate', count });
  }
  function applyOrder(next, ms, where) {
    t0.current = performance.now();
    last.current = { ms, where };
    setOrder(next);
    setActive((a) => Math.min(a, Math.max(0, next.length - 1)));
  }
  // The query follows the state it reads; the answer arrives through applyOrder, synchronously or from the worker.
  useEffect(() => {
    if (!rows.length) return;
    const params = { filter, sort: sort.key, dir: sort.dir };
    if (compute === 'main') {
      const started = performance.now();
      const next = sortFilter(rows, params);
      applyOrder(next, performance.now() - started, 'main thread');
    } else worker.current.postMessage({ type: 'query', id: ++queryId.current, ...params });
  }, [rows, sort, filter, compute]);
  // After the commit that shows a new order: force layout and report, as the baseline does right after its render.
  useLayoutEffect(() => {
    if (!t0.current) return;
    void container.current.offsetHeight;
    status.current.textContent = `${order.length.toLocaleString()} of ${rows.length.toLocaleString()} rows, sorted and filtered in ${last.current.ms.toFixed(1)} ms on the ${last.current.where}, rendered in ${(performance.now() - t0.current).toFixed(1)} ms`;
    t0.current = 0;
  });
  // The window follows the scroll position and the viewport size, one state update per frame.
  const measureView = () => setView({ top: viewport.current.scrollTop, height: viewport.current.clientHeight });
  useEffect(() => { const ro = new ResizeObserver(measureView); ro.observe(viewport.current); return () => ro.disconnect(); }, []);
  const onScroll = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; measureView(); }); };

  const first = Math.max(0, Math.floor(view.top / ROW_H) - OVERSCAN);
  const lastPos = Math.min(order.length, first + Math.ceil(view.height / ROW_H) + OVERSCAN * 2);
  const inView = [];
  for (let pos = first; pos < lastPos; pos++) { const index = order[pos]; if (rows[index]) inView.push({ pos, index, row: rows[index] }); }

  const toggle = (set, index) => { const next = new Set(set); if (next.has(index)) next.delete(index); else next.add(index); return next; };
  const onClick = (e) => {
    const rowEl = e.target.closest('.grid-row[data-index]');
    if (!rowEl) return;
    const index = Number(rowEl.dataset.index);
    const pos = Number(rowEl.dataset.pos);
    if (e.shiftKey && anchor.current >= 0) {
      const [from, to] = [anchor.current, pos].sort((a, b) => a - b);
      setSelected((set) => { const next = new Set(set); for (let p = from; p <= to; p++) next.add(order[p]); return next; });
    } else { setSelected((set) => toggle(set, index)); anchor.current = pos; }
    setActive(pos);
  };
  const onKeyDown = (e) => {
    const max = order.length - 1;
    const page = Math.floor(viewport.current.clientHeight / ROW_H);
    let next = active;
    if (e.key === ' ') { setSelected((set) => toggle(set, order[active])); anchor.current = active; }
    else if (KEYS[e.key]) next = Math.max(0, Math.min(max, KEYS[e.key](active, page, max)));
    else return;
    e.preventDefault();
    setActive(next);
    const top = next * ROW_H;
    const vp = viewport.current;
    if (top < vp.scrollTop + ROW_H) vp.scrollTop = top - ROW_H;
    else if (top + ROW_H > vp.scrollTop + vp.clientHeight) vp.scrollTop = top + ROW_H * 2 - vp.clientHeight;
  };
  const exportCsv = () => {
    const lines = [COLUMNS.map((c) => c.label).join(',')];
    for (const i of order) lines.push(COLUMNS.map((c) => JSON.stringify(String(rows[i][c.key]))).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'rows.csv' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const n = selected.size;

  return (
    <>
      <div className="grid-toolbar">
        <label>Rows
          <select id="rows" className="select" defaultValue="50000" onChange={(e) => load(Number(e.target.value))}>
            <option value="1000">1,000</option><option value="50000">50,000</option><option value="200000">200,000</option>
          </select>
        </label>
        <label htmlFor="filter" className="visually-hidden">Filter rows</label>
        <input id="filter" className="input" type="search" placeholder="Filter by name, team or status" style={{ maxWidth: '18rem' }} autoComplete="off"
          onChange={(e) => { clearTimeout(timer.current); const value = e.target.value; timer.current = setTimeout(() => setFilter(value), 150); }} />
        <fieldset>
          <legend>Sort and filter on</legend>
          <label><input type="radio" name="compute" value="worker" checked={compute === 'worker'} onChange={() => setCompute('worker')} /> Worker</label>
          <label><input type="radio" name="compute" value="main" checked={compute === 'main'} onChange={() => setCompute('main')} /> Main thread</label>
        </fieldset>
        <button id="export" className="btn" type="button" onClick={exportCsv}>Export CSV</button>
        <span id="status" ref={status} className="muted" aria-live="polite"></span>
      </div>
      <div id="viewport" ref={viewport} className="grid-viewport" tabIndex={0} role="grid" aria-label="Rows" aria-rowcount={order.length} aria-multiselectable="true" onScroll={onScroll} onClick={onClick} onKeyDown={onKeyDown}>
        <div className="grid-row grid-row--head" role="row" id="head">
          {COLUMNS.map((c) => (
            <div key={c.key} className={`grid-cell${c.numeric ? ' num' : ''}`} role="columnheader" aria-sort={sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}>
              <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}>{c.label}</button>
            </div>
          ))}
        </div>
        <div id="spacer" className="grid-spacer" style={{ height: `${order.length * ROW_H}px` }}>
          <div id="rows-container" ref={container} className="grid-rows" style={{ transform: `translateY(${first * ROW_H}px)` }}>
            {inView.map(({ pos, index, row }) => (
              // Keyed by position: scrolling and sorting rewrite the cells of the same few elements, nothing is created or moved.
              <div key={pos} className={`grid-row${selected.has(index) ? ' is-selected' : ''}${pos === active ? ' is-active' : ''}`} role="row" aria-rowindex={pos + 1} aria-selected={selected.has(index)} data-index={index} data-pos={pos}>
                {COLUMNS.map((c) => <div key={c.key} className={`grid-cell${c.numeric ? ' num' : ''}`} role="gridcell">{String(row[c.key])}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p id="selection" className="muted" style={{ marginTop: 'var(--space-3)' }}>{n ? `${n.toLocaleString()} row${n === 1 ? '' : 's'} selected.` : 'No rows selected. Click selects, shift-click extends, arrow keys move, space toggles.'}</p>
    </>
  );
}

mount(
  <Layout pattern="table" variant="heavy">
    <>
      <h1>Grid</h1>
      <p>Rows are generated in a Web Worker. Only the rows in view exist in the DOM: React renders the window from the scroll position and keys the rows by position, so scrolling rewrites cells instead of creating elements. Sorting and filtering run in the worker or, for comparison, on the main thread. Rows can be selected with the mouse or keyboard and exported as CSV.</p>
    </>
    <Grid />
  </Layout>,
);
