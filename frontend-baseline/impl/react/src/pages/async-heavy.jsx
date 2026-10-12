import { Component, Suspense, use, useEffect, useOptimistic, useState, useTransition } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import { getJSON, postJSON } from '@baseline/src/lib/api.js';
import { toast } from '@baseline/src/lib/toast.js';
import '@baseline/src/pages/common-2.css';

let t0 = performance.now();
let addLog = () => {};
const stamp = (text) => `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`;

// Each source is a cached promise per post and attempt, so `use` sees the same promise across renders and a retry
// is a new attempt. "related" depends on "post" (a waterfall the cache deduplicates).
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const sources = {
  post: (id, n) => cached(`post:${id}:${n}`, () => getJSON(`/api/posts/${id}`)),
  related: (id, n) => cached(`related:${id}:${n}`, async () => {
    const post = await getJSON(`/api/posts/${id}`);
    const { items } = await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`);
    return items.filter((p) => p.id !== post.id).slice(0, 3);
  }),
  status: (id, n) => cached(`status:${id}:${n}`, async () => {
    const res = await fetch('/api/flaky');
    if (!res.ok) throw new Error(`status answered ${res.status}`);
    return res.json();
  }),
};

// A rejected promise read with `use` throws to the nearest error boundary, which is still a class.
class Part extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { addLog(`${this.props.name}: failed (${error.message})`, 'err'); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="notice notice--error"><p>Failed: {this.state.error.message}</p><button className="btn btn--sm" type="button" onClick={this.props.onRetry}>Retry {this.props.name} only</button></div>;
  }
}

function Ready({ name, children }) { // logs when a part commits
  useEffect(() => addLog(`${name}: ready`, 'ok'), [name]);
  return children;
}

function PostPart({ id, attempt, setPendingLikes }) {
  const loaded = use(sources.post(id, attempt));
  const [patch, setPatch] = useState(null); // what the server confirmed since the load
  const post = { ...loaded, ...patch };
  // Optimistic lane: the flipped value shows while the action runs and is dropped when the action ends;
  // a success is kept through `patch`, a failure simply reverts.
  const [shown, flip] = useOptimistic(post, (p, delta) => ({ ...p, ...delta }));
  const [, startLike] = useTransition();
  const like = () => {
    setPendingLikes((n) => n + 1); // a plain update before the Transition: a Transition update would render after the optimistic one
    startLike(async () => {
      const liked = !shown.liked;
      flip({ liked, likes: shown.likes + (liked ? 1 : -1) });
      // Updates after an await are not part of the Transition unless wrapped again; without this the lane empties and the
      // server's answer lands a frame before the optimistic value is dropped.
      try {
        const confirmed = await postJSON(`/api/posts/${post.id}/like`, {});
        startLike(() => { setPatch(confirmed); setPendingLikes((n) => n - 1); });
        addLog('like confirmed', 'ok');
      } catch (err) {
        startLike(() => setPendingLikes((n) => n - 1));
        addLog(`like rolled back: ${err.message}`, 'err');
        toast('Like rolled back', { type: 'error' });
      }
    });
  };
  return (
    <Ready name="post">
      <p><strong>{shown.title}</strong></p>
      <p className="muted">{shown.excerpt}</p>
      <button className="btn btn--sm" type="button" onClick={like}>{shown.liked ? 'Liked' : 'Like'} ({shown.likes})</button>
    </Ready>
  );
}
function RelatedPart({ id, attempt }) {
  const items = use(sources.related(id, attempt));
  return <Ready name="related"><ul>{items.map((p) => <li key={p.id}>{p.title}</li>)}</ul></Ready>;
}
function StatusPart({ id, attempt }) {
  const s = use(sources.status(id, attempt));
  return <Ready name="status"><p>Server value {s.value}</p></Ready>;
}

const skeleton = <p className="skeleton" style={{ height: '3rem' }}> </p>;
const Section = ({ title, children }) => <section className="panel stack"><h2 style={{ fontSize: '1rem', margin: 0 }}>{title}</h2>{children}</section>;

function Composed() {
  const [selected, setSelected] = useState(3); // the select answers at once; the view's id follows inside the Transition
  const [id, setId] = useState(3);
  const [atomic, setAtomic] = useState(true);
  const [attempts, setAttempts] = useState({ post: 0, related: 0, status: 0 });
  const [pendingLikes, setPendingLikes] = useState(0);
  const [log, setLog] = useState([]);
  const [isPending, startTransition] = useTransition();
  addLog = (text, cls = '') => setLog((l) => [{ text: stamp(text), cls }, ...l]);

  // Atomic: the change is a Transition, so the old view stays (dimmed) until every `use` in the one boundary has
  // resolved, then everything commits in one paint; a newer Transition replaces a pending one, so stale answers never
  // show. Stream: a plain update suspends each part's own boundary and each paints as it lands.
  const load = (next, mode = atomic) => {
    t0 = performance.now();
    addLog(`load post ${next}`);
    setSelected(next);
    if (mode) startTransition(() => setId(next)); else setId(next);
  };
  const retry = (name) => { addLog(`retry ${name}`); const bump = () => setAttempts((a) => ({ ...a, [name]: a[name] + 1 })); if (atomic) startTransition(bump); else bump(); };
  useEffect(() => { if (atomic) addLog('committed in one paint'); }, [id, atomic]);

  const parts = [
    ['post', 'Post', <PostPart key={`post-${id}`} id={id} attempt={attempts.post} setPendingLikes={setPendingLikes} />],
    ['related', 'Related', <RelatedPart key={`related-${id}`} id={id} attempt={attempts.related} />],
    ['status', 'Status (flaky)', <StatusPart key={`status-${id}`} id={id} attempt={attempts.status} />],
  ];
  const sections = parts.map(([name, title, element]) => (
    <Section key={name} title={title}>
      <Part key={attempts[name]} name={name} onRetry={() => retry(name)}>{atomic ? element : <Suspense fallback={skeleton}>{element}</Suspense>}</Part>
    </Section>
  ));
  const fallback = parts.map(([name, title]) => <Section key={name} title={title}>{skeleton}</Section>);
  return (
    <>
      <div className="cluster" style={{ marginBottom: 'var(--space-4)' }}>
        <label>Post <select id="post" className="select" value={selected} onChange={(e) => load(Number(e.target.value))}>{Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>Post {i + 1}</option>)}</select></label>
        <label className="switch"><input type="checkbox" id="atomic" checked={atomic} onChange={(e) => { setAtomic(e.target.checked); load(id, e.target.checked); }} /> Atomic commit</label>
        <span id="lane" className="muted">{pendingLikes ? `${pendingLikes} optimistic update${pendingLikes === 1 ? '' : 's'} pending` : ''}</span>
      </div>
      <div id="view" className={`two-col${isPending ? ' stale' : ''}`}>
        {atomic ? <Suspense fallback={fallback}>{sections}</Suspense> : sections}
      </div>
      <h2 style={{ marginTop: 'var(--space-6)' }}>Timeline</h2>
      <ol id="log" className="log-list">{log.map((entry, i) => <li key={log.length - i} className={entry.cls}>{entry.text}</li>)}</ol>
    </>
  );
}

mount(
  <Layout pattern="async" variant="heavy">
    <>
      <h1>Composed view</h1>
      <p>One screen built from three sources: the post, related posts (which depend on the post) and a status call that fails half the time. Atomic mode is one <code>Suspense</code> boundary around three <code>use()</code> reads inside a Transition: the old view stays until all have resolved and everything commits in one paint. Stream mode gives each part its own boundary. A failed source has its own error boundary and retries alone; likes go through <code>useOptimistic</code> and revert when the server refuses.</p>
    </>
    <Composed />
  </Layout>,
);
