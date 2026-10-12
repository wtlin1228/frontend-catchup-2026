import { useEffect, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';

const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));

// The effect owns the request and its cancellation; `attempt` re-runs it for "Try again".
// StrictMode runs the effect twice in dev, which is why the AbortController matters.
function Posts() {
  const [state, setState] = useState({ status: 'loading', items: [], error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    fetch('/api/posts?limit=6', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(`The server answered ${res.status}`); return res.json(); })
      .then(({ items }) => setState({ status: 'done', items, error: null }))
      .catch((err) => { if (err.name !== 'AbortError') setState({ status: 'error', items: [], error: err }); });
    return () => controller.abort();
  }, [attempt]);

  if (state.status === 'loading') return <div id="list" aria-busy="true"><p className="muted">Loading posts…</p></div>;
  if (state.status === 'error') {
    return (
      <div id="list">
        <div className="notice notice--error" role="alert">
          <p>Could not load posts. {state.error.message}.</p>
          <button className="btn btn--sm" type="button" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>
      </div>
    );
  }
  return (
    <div id="list">
      <ul className="stack">
        {state.items.map((post) => (
          <li key={post.id}>
            <a href={`/dynamic/heavy.html#/posts/${post.id}`}>{post.title}</a>
            <p className="muted" style={{ marginBottom: 0 }}>{post.author}, {formatDate(post.date)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

mount(
  <Layout pattern="dynamic" variant="light">
    <>
      <h1>Latest posts</h1>
      <p>The smallest dynamic page: request <code>/api/posts</code>, show a loading state, render the list, handle failure. No router, no cache, no URL state. The state machine is one <code>useState</code>; the request lives in one effect with its cleanup.</p>
    </>
    <Posts />
  </Layout>,
);
