// Pattern 3 heavy in React's own terms: React Router (hash history, as in the baseline) for the routes and the
// URL state, TanStack Query for the cache, prefetching, invalidation and the optimistic like. The baseline's
// router.js and api.js disappear; the rest is the same page.
import { useEffect, useRef, useState } from 'react';
import { createHashRouter, RouterProvider, Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { QueryClient, QueryClientProvider, keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import { toast } from '@baseline/src/lib/toast.js';
import '@baseline/src/lib/elements.js';
import '@baseline/src/pages/dynamic-heavy.css';

const PAGE_SIZE = 8;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });

// --- the data layer: three query definitions and two requests
class HttpError extends Error { constructor(status, body) { super(body?.error ?? `HTTP ${status}`); this.status = status; this.body = body; } }
async function request(url, init) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json', ...(init?.body && { 'content-type': 'application/json' }) }, ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}
const postsQuery = (q, page) => ({ queryKey: ['posts', { q, page }], queryFn: () => request(`/api/posts?${new URLSearchParams({ q, page, limit: PAGE_SIZE })}`) });
const postQuery = (id) => ({ queryKey: ['post', id], queryFn: () => request(`/api/posts/${id}`) });
const relatedQuery = (tag) => ({ queryKey: ['posts', { tag, limit: 4 }], queryFn: () => request(`/api/posts?tag=${encodeURIComponent(tag)}&limit=4`) });
const hasSessionCookie = () => document.cookie.split('; ').some((c) => c.startsWith('session='));
const loginRedirect = () => { addEventListener('pageswap', (e) => e.viewTransition?.skipTransition(), { once: true }); location.replace(`/account/heavy.html?next=${encodeURIComponent(location.pathname + location.hash)}`); };

// --- cross-cutting: title and route announcement, as a hook
function useTitle(text) {
  useEffect(() => {
    document.title = `${text} · Posts · Frontend Baseline, React port`;
    const announcer = document.getElementById('route-announcer');
    if (announcer) announcer.textContent = `Navigated to ${document.title}`;
  }, [text]);
}
let lastListHref = '/'; // "Back to all posts" restores the list's search and page

// ---------------------------------------------------------------- list
function ListView() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [input, setInput] = useState(q);
  const location = useLocation();
  useTitle(q ? `Search "${q}"` : 'All posts');
  useEffect(() => { lastListHref = location.pathname + location.search; }, [location]);
  // The search is written to the URL as you type (debounced, replacing history); the query follows the URL.
  useEffect(() => {
    const t = setTimeout(() => { if (input.trim() !== q) setParams(input.trim() ? { q: input.trim() } : {}, { replace: true }); }, 250);
    return () => clearTimeout(t);
  }, [input, q, setParams]);
  const list = useQuery({ ...postsQuery(q, page), placeholderData: keepPreviousData });
  return (
    <div className="posts-layout">
      <aside className="posts-side">
        <input type="search" className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search titles and tags" aria-label="Search posts" autoComplete="off" />
        <p className="muted posts-side__hint">The search is written to the URL as you type.</p>
        <Link className="btn btn--primary" to="/new">New post</Link>
      </aside>
      <div className="post-results" aria-busy={list.isFetching || undefined}>
        {list.isPending ? <SkeletonCards n={PAGE_SIZE} />
          : list.isError ? <ErrorPanel title="Could not load posts." error={list.error} retry={() => list.refetch()} />
          : !list.data.items.length ? <div className="notice"><p>No posts match "{q}".</p><Link to="/">Clear the search</Link></div>
          : <>
              {list.data.items.map((post) => (
                <article key={post.id} className="post-card">
                  <h2 className="post-card__title"><PostLink post={post} /></h2>
                  <p className="post-card__excerpt">{post.excerpt}</p>
                  <Meta post={post} />
                </article>
              ))}
              <nav className="pager" aria-label="Pagination">
                <PageLink q={q} page={page - 1} totalPages={list.data.totalPages}>Previous</PageLink>
                <span className="muted">Page {list.data.page} of {list.data.totalPages}, {list.data.total} posts</span>
                <PageLink q={q} page={page + 1} totalPages={list.data.totalPages}>Next</PageLink>
              </nav>
            </>}
      </div>
    </div>
  );
}
const PageLink = ({ q, page, totalPages, children }) => (
  <Link className="btn btn--sm" to={{ pathname: '/', search: `?${new URLSearchParams({ ...(q && { q }), page })}` }} aria-disabled={page < 1 || page > totalPages ? 'true' : undefined}>{children}</Link>
);
// Prefetch on hover and focus: the detail view is usually a cache hit by the time it is clicked.
function PostLink({ post }) {
  const client = useQueryClient();
  const prefetch = () => client.prefetchQuery(postQuery(post.id));
  return <Link to={`/posts/${post.id}`} onMouseEnter={prefetch} onFocus={prefetch}>{post.title}</Link>;
}
const Meta = ({ post }) => (
  <p className="post-meta muted">
    <span>{post.author}</span>
    <relative-time datetime={post.date}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(post.date))}</relative-time>
    <span>{post.readingMinutes} min read</span>
    <span className="post-meta__tags">{post.tags.map((tag) => <Link key={tag} className="tag" to={`/?q=${encodeURIComponent(tag)}`}>{tag}</Link>)}</span>
  </p>
);
const SkeletonCards = ({ n }) => Array.from({ length: n }, (_, i) => (
  <div key={i} className="post-card post-card--skeleton" aria-hidden="true">
    <div className="skeleton" style={{ width: '60%', height: '1.4rem' }} />
    <div className="skeleton" style={{ width: '100%', height: '1rem', marginTop: '0.75rem' }} />
    <div className="skeleton" style={{ width: '40%', height: '0.9rem', marginTop: '0.5rem' }} />
  </div>
));
const ErrorPanel = ({ title, error, retry }) => (
  <div className="notice notice--error" role="alert">
    <p><strong>{title}</strong> {error instanceof HttpError ? `The server answered ${error.status}.` : 'The request failed before the server answered.'}</p>
    <button className="btn btn--sm" type="button" onClick={retry}>Try again</button>
  </div>
);

// ---------------------------------------------------------------- detail
function DetailView() {
  const { id } = useParams();
  const post = useQuery(postQuery(id));
  const related = useQuery({ ...relatedQuery(post.data?.tags[0] ?? ''), enabled: Boolean(post.data) }); // a dependent query: the waterfall
  const title = useRef(null);
  useTitle(post.data?.title ?? 'Loading…');
  useEffect(() => { if (post.data) title.current?.focus({ preventScroll: true }); }, [post.data]);
  if (post.isPending) return <article className="post" aria-busy="true"><div className="skeleton" style={{ width: '70%', height: '2rem' }} />{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: '100%', height: '4rem', marginTop: '1rem' }} />)}</article>;
  if (post.isError) return post.error instanceof HttpError && post.error.status === 404 ? <NotFound /> : <ErrorPanel title="Could not load this post." error={post.error} retry={() => post.refetch()} />;
  const others = related.data?.items.filter((p) => p.id !== post.data.id).slice(0, 3);
  return (
    <article className="post">
      <p><Link to={lastListHref}>Back to all posts</Link></p>
      <h2 ref={title} className="post__title" tabIndex={-1}>{post.data.title}</h2>
      <Meta post={post.data} />
      <p><LikeButton post={post.data} /></p>
      <div className="post__body">{post.data.body.split('\n\n').map((text, i) => <p key={i}>{text}</p>)}</div>
      <h3>Related</h3>
      <div className="post-related">
        {related.isPending ? <p className="muted">Loading related posts…</p>
          : related.isError ? <p className="muted">Related posts are unavailable right now.</p>
          : others.length ? <ul className="post-related__list">{others.map((p) => <li key={p.id}><PostLink post={p} /></li>)}</ul>
          : <p className="muted">No other post shares this tag.</p>}
      </div>
    </article>
  );
}
// Optimistic update with TanStack Query: write the cache first, roll back from the snapshot on failure, refetch after.
function LikeButton({ post }) {
  const client = useQueryClient();
  const key = ['post', String(post.id)];
  const like = useMutation({
    mutationFn: () => request(`/api/posts/${post.id}/like`, { method: 'POST', body: '{}' }),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData(key);
      client.setQueryData(key, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
      return { before };
    },
    onError: (err, _vars, context) => { client.setQueryData(key, context.before); toast(err.message || 'Could not save your like', { type: 'error' }); },
    onSuccess: (result) => client.setQueryData(key, (p) => ({ ...p, ...result })),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return <button className="btn btn--sm" type="button" aria-pressed={post.liked} onClick={() => like.mutate()}>{post.liked ? 'Liked' : 'Like'} ({post.likes})</button>;
}

// ---------------------------------------------------------------- new (guarded)
function NewPostView() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const titleInput = useRef(null);
  useTitle('New post');
  useEffect(() => { if (!hasSessionCookie()) loginRedirect(); else titleInput.current?.focus(); }, []);
  const publish = useMutation({
    mutationFn: (data) => request('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (created) => { client.invalidateQueries({ queryKey: ['posts'] }); toast('Published', { type: 'success' }); navigate(`/posts/${created.id}`); },
    onError: (err) => {
      if (err instanceof HttpError && err.status === 401) return loginRedirect();
      if (err instanceof HttpError && err.status === 400 && err.body?.errors) { setErrors(err.body.errors); setStatus('Fix the highlighted fields.'); }
      else setStatus('Publishing failed. Try again.');
    },
  });
  if (!hasSessionCookie()) return null;
  return (
    <form className="form panel" noValidate onSubmit={(e) => { e.preventDefault(); setErrors({}); setStatus('Publishing…'); publish.mutate(Object.fromEntries(new FormData(e.currentTarget))); }}>
      <h2>New post</h2>
      <div className="field"><label htmlFor="np-title">Title</label><input id="np-title" ref={titleInput} name="title" className="input" required maxLength={120} /><p className="field__error">{errors.title}</p></div>
      <div className="field"><label htmlFor="np-tags">Tags, comma separated</label><input id="np-tags" name="tags" className="input" placeholder="routing, state" /></div>
      <div className="field"><label htmlFor="np-body">Body</label><textarea id="np-body" name="body" className="textarea" rows={8} required /><p className="field__error">{errors.body}</p></div>
      <div className="cluster"><button className="btn btn--primary" type="submit" disabled={publish.isPending}>Publish</button><Link className="btn btn--ghost" to={lastListHref}>Cancel</Link></div>
      <p className="form-status muted" role="status" aria-live="polite">{status}</p>
    </form>
  );
}

function NotFound() {
  useTitle('Not found');
  return <div className="notice notice--warning"><p><strong>Nothing here.</strong> The route {location.hash || '#/'} does not exist.</p><Link to="/">Go to all posts</Link></div>;
}

// ---------------------------------------------------------------- shell and router
function Shell() {
  return (
    <Layout pattern="dynamic" variant="heavy">
      <>
        <h1>Posts</h1>
        <p>A small single-page app inside a multi-page site, with React Router on hash history and TanStack Query as the data layer. The URL hash carries the route and the search query; data comes from <code>/api/posts</code> with artificial latency so loading states stay visible. The like button updates optimistically and rolls back when the flaky endpoint fails.</p>
      </>
      <p id="route-announcer" className="visually-hidden" aria-live="polite" />
      <div id="app"><Outlet /></div>
    </Layout>
  );
}
// A plain GET form (the agent light page) lands here with ?q=; turn it into the hash route the router reads.
const incoming = new URLSearchParams(location.search);
if (!location.hash && incoming.has('q')) history.replaceState(null, '', `${location.pathname}#/?${new URLSearchParams({ q: incoming.get('q') })}`);
const router = createHashRouter([{ element: <Shell />, children: [{ path: '/', element: <ListView /> }, { path: '/posts/:id', element: <DetailView /> }, { path: '/new', element: <NewPostView /> }, { path: '*', element: <NotFound /> }] }]);
mount(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
