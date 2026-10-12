import { Suspense, use, useDeferredValue, useEffect, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import '@baseline/src/pages/common-2.css';

const TAGS = ['rendering', 'state', 'forms', 'performance', 'routing'];
const t0 = performance.now();
const stamp = (text) => `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`;
let latest = TAGS[0];
let addLog = () => {};

// `use` needs the same promise on every render, so each tag's request is cached; the baseline refetches on every click.
const cache = new Map();
function postsFor(tag) {
  if (!cache.has(tag)) {
    cache.set(tag, fetch(`/api/posts?tag=${tag}&limit=5`).then((r) => r.json()).then(({ items }) => {
      if (tag !== latest) addLog(`${tag}: response arrived after a newer request; nothing painted`, 'err');
      return items;
    }));
  }
  return cache.get(tag);
}

function Posts({ tag }) {
  const items = use(postsFor(tag));
  useEffect(() => addLog(`${tag}: ${items.length} posts painted`, 'ok'), [tag, items]);
  return items.length
    ? <ul className="stack">{items.map((p) => <li key={p.id}><a href={`/dynamic/heavy.html#/posts/${p.id}`}>{p.title}</a></li>)}</ul>
    : <p className="muted">No posts with this tag.</p>;
}

function Tabs() {
  const [selected, setSelected] = useState(TAGS[0]);
  const [keep, setKeep] = useState(true);
  const [log, setLog] = useState([]);
  addLog = (text, cls = '') => setLog((l) => [{ text: stamp(text), cls }, ...l]);
  // The deferred value lags behind the selection while the new tab's data loads; React keeps the old list on screen
  // instead of the fallback, and a selection made meanwhile simply replaces the pending one: the latest wins.
  const deferred = useDeferredValue(selected);
  const tag = keep ? deferred : selected;
  const busy = keep && deferred !== selected;
  const select = (t) => { latest = t; setSelected(t); };
  return (
    <>
      <p><label className="switch"><input type="checkbox" id="transition" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Keep the old content while loading (transition)</label></p>
      <div className="tabbar" role="tablist" id="tabs" aria-label="Tags">
        {TAGS.map((t) => <button key={t} role="tab" type="button" aria-selected={t === selected} aria-busy={busy && t === selected ? 'true' : undefined} onClick={() => select(t)}>{t}</button>)}
      </div>
      <div id="panel" role="tabpanel" className={busy ? 'stale' : undefined}>
        <Suspense fallback={<p className="skeleton" style={{ height: '8rem' }}> </p>}>
          <Posts tag={tag} />
        </Suspense>
      </div>
      <h2 style={{ marginTop: 'var(--space-6)' }}>Log</h2>
      <ol id="log" className="log-list">{log.map((entry, i) => <li key={log.length - i} className={entry.cls}>{entry.text}</li>)}</ol>
    </>
  );
}

mount(
  <Layout pattern="async" variant="light">
    <>
      <h1>Tabs that wait</h1>
      <p>Switching a tab fetches its posts. In naive mode the panel suspends and shows the fallback on every switch. In transition mode <code>useDeferredValue</code> keeps the old list, dimmed, until the new one is ready, and only the latest selection paints. Click between tabs quickly to see the difference.</p>
    </>
    <Tabs />
  </Layout>,
);
