import './dynamic-heavy.css';
import '../lib/elements.js';
import { h, mount, debounce, formatDate } from '../lib/dom.js';
import { getJSON, postJSON, prefetch, invalidate, HttpError } from '../lib/api.js';
import { createRouter } from '../lib/router.js';
import { hasSessionCookie } from '../lib/auth.js';
import { toast } from '../lib/toast.js';

const root = document.getElementById('app');
const announcer = document.getElementById('route-announcer');
const PAGE_SIZE = 8;
let lastListHref = '#/'; // "Back to all posts" restores the list's search and page

const router = createRouter(
  [
    { path: '/', view: listView },
    { path: '/posts/:id', view: detailView },
    { path: '/new', view: newPostView },
    { path: '*', view: notFoundView },
  ],
  { root, announce: (title) => { announcer.textContent = `Navigated to ${title}`; } },
);
router.start();

const setTitle = (text) => { document.title = `${text} · Posts · Frontend Baseline`; };
const loginRedirect = () => location.replace(`/account/heavy.html?next=${encodeURIComponent(location.pathname + location.hash)}`);

// ---------------------------------------------------------------- list
async function listView({ query, signal, root, navigate }) {
  const state = { q: query.get('q') ?? '', page: Math.max(1, Number(query.get('page')) || 1) };
  setTitle(state.q ? `Search "${state.q}"` : 'All posts');
  lastListHref = location.hash || '#/';

  const results = h('div', { class: 'post-results', 'aria-busy': 'true' }, skeletonCards(4));
  const search = h('input', {
    type: 'search', class: 'input', value: state.q, placeholder: 'Search titles and tags', 'aria-label': 'Search posts', autocomplete: 'off',
  });
  mount(root,
    h('div', { class: 'posts-layout' },
      h('aside', { class: 'posts-side' },
        search,
        h('p', { class: 'muted posts-side__hint' }, 'The search is written to the URL as you type.'),
        h('a', { class: 'btn btn--primary', href: '#/new' }, 'New post'),
      ),
      results,
    ),
  );

  async function load() {
    results.setAttribute('aria-busy', 'true');
    const url = `/api/posts?${new URLSearchParams({ q: state.q, page: state.page, limit: PAGE_SIZE })}`;
    try {
      const data = await getJSON(url, { signal });
      if (signal.aborted) return;
      renderList(results, data, state);
    } catch (err) {
      if (signal.aborted) return;
      mount(results, errorPanel('Could not load posts.', err, load));
    } finally {
      results.removeAttribute('aria-busy');
    }
  }

  search.addEventListener('input', debounce(() => {
    state.q = search.value.trim();
    state.page = 1;
    navigate('/', { q: state.q }, { replace: true }); // URL updated silently: the input keeps focus
    lastListHref = location.hash || '#/';
    load();
  }, 250));

  load();
}

function renderList(container, data, state) {
  if (!data.items.length) {
    mount(container, h('div', { class: 'notice' }, h('p', null, `No posts match "${state.q}".`), h('a', { href: '#/' }, 'Clear the search')));
    return;
  }
  const cards = data.items.map((post) =>
    h('article', { class: 'post-card' },
      h('h2', { class: 'post-card__title' }, postLink(post)),
      h('p', { class: 'post-card__excerpt' }, post.excerpt),
      meta(post),
    ),
  );
  const pageLink = (page, label) =>
    h('a', {
      class: 'btn btn--sm',
      href: router.href('/', { q: state.q, page }),
      'aria-disabled': page < 1 || page > data.totalPages ? 'true' : null,
    }, label);
  const pager = h('nav', { class: 'pager', 'aria-label': 'Pagination' },
    pageLink(state.page - 1, 'Previous'),
    h('span', { class: 'muted' }, `Page ${data.page} of ${data.totalPages}, ${data.total} posts`),
    pageLink(state.page + 1, 'Next'),
  );
  mount(container, cards, pager);
}

// Prefetch on hover/focus: the detail view is usually a cache hit by the time it is clicked.
const postLink = (post) =>
  h('a', { href: `#/posts/${post.id}`, onmouseenter: () => prefetch(`/api/posts/${post.id}`), onfocus: () => prefetch(`/api/posts/${post.id}`) }, post.title);

const meta = (post) =>
  h('p', { class: 'post-meta muted' },
    h('span', null, post.author),
    h('relative-time', { datetime: post.date }, formatDate(post.date)),
    h('span', null, `${post.readingMinutes} min read`),
    h('span', { class: 'post-meta__tags' }, post.tags.map((tag) => h('a', { class: 'tag', href: router.href('/', { q: tag }) }, tag))),
  );

const skeletonCards = (n) =>
  Array.from({ length: n }, () =>
    h('div', { class: 'post-card post-card--skeleton', 'aria-hidden': 'true' },
      h('div', { class: 'skeleton', style: { width: '60%', height: '1.4rem' } }),
      h('div', { class: 'skeleton', style: { width: '100%', height: '1rem', marginTop: '0.75rem' } }),
      h('div', { class: 'skeleton', style: { width: '40%', height: '0.9rem', marginTop: '0.5rem' } }),
    ),
  );

function errorPanel(title, err, retry) {
  const detail = err instanceof HttpError ? `The server answered ${err.status}.` : 'The request failed before the server answered.';
  return h('div', { class: 'notice notice--error', role: 'alert' },
    h('p', null, h('strong', null, title), ` ${detail}`),
    h('button', { class: 'btn btn--sm', type: 'button', onclick: retry }, 'Try again'),
  );
}

// ---------------------------------------------------------------- detail
async function detailView({ params, signal, root, refresh }) {
  mount(root,
    h('article', { class: 'post', 'aria-busy': 'true' },
      h('div', { class: 'skeleton', style: { width: '70%', height: '2rem' } }),
      ...[1, 2, 3].map(() => h('div', { class: 'skeleton', style: { width: '100%', height: '4rem', marginTop: '1rem' } })),
    ),
  );
  let post;
  try {
    post = await getJSON(`/api/posts/${params.id}`, { signal });
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof HttpError && err.status === 404) return notFoundView({ root });
    return mount(root, errorPanel('Could not load this post.', err, refresh));
  }
  if (signal.aborted) return;

  setTitle(post.title);
  const related = h('div', { class: 'post-related' }, h('p', { class: 'muted' }, 'Loading related posts…'));
  const title = h('h2', { class: 'post__title', tabindex: -1 }, post.title);
  mount(root,
    h('article', { class: 'post' },
      h('p', null, h('a', { href: lastListHref }, 'Back to all posts')),
      title,
      meta(post),
      h('p', null, likeButton(post)),
      h('div', { class: 'post__body' }, post.body.split('\n\n').map((text) => h('p', null, text))),
      h('h3', null, 'Related'),
      related,
    ),
  );
  title.focus({ preventScroll: true }); // move focus to the new content, as a full page load would

  // A second, dependent request: a waterfall. Loader-based frameworks let you parallelise or stream this.
  try {
    const data = await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`, { signal });
    if (signal.aborted) return;
    const others = data.items.filter((p) => p.id !== post.id).slice(0, 3);
    mount(related, others.length
      ? h('ul', { class: 'post-related__list' }, others.map((p) => h('li', null, postLink(p))))
      : h('p', { class: 'muted' }, 'No other post shares this tag.'));
  } catch {
    if (!signal.aborted) mount(related, h('p', { class: 'muted' }, 'Related posts are unavailable right now.'));
  }
}

// Optimistic update: flip the UI first, send the request, roll back if the server says no.
// The mock endpoint fails 30% of the time on purpose.
function likeButton(post) {
  const button = h('button', { class: 'btn btn--sm', type: 'button' });
  const paint = () => {
    button.textContent = `${post.liked ? 'Liked' : 'Like'} (${post.likes})`;
    button.setAttribute('aria-pressed', String(post.liked));
  };
  paint();
  button.addEventListener('click', async () => {
    const before = { liked: post.liked, likes: post.likes };
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    paint();
    try {
      Object.assign(post, await postJSON(`/api/posts/${post.id}/like`, {}));
      invalidate(`/api/posts/${post.id}`); // the cached copy is stale now
    } catch (err) {
      Object.assign(post, before); // roll back
      toast(err.message || 'Could not save your like', { type: 'error' });
    }
    paint();
  });
  return button;
}

// ---------------------------------------------------------------- new (guarded)
function newPostView({ root, navigate }) {
  // Route guard. The server checks the cookie as well; this only avoids showing a form that cannot be sent.
  if (!hasSessionCookie()) return loginRedirect();
  setTitle('New post');

  const errors = { title: h('p', { class: 'field__error' }), body: h('p', { class: 'field__error' }) };
  const status = h('p', { class: 'form-status muted', role: 'status', 'aria-live': 'polite' });
  const form = h('form', { class: 'form panel', novalidate: true, onsubmit: submit },
    h('h2', null, 'New post'),
    h('div', { class: 'field' }, h('label', { for: 'np-title' }, 'Title'), h('input', { id: 'np-title', name: 'title', class: 'input', required: true, maxlength: 120 }), errors.title),
    h('div', { class: 'field' }, h('label', { for: 'np-tags' }, 'Tags, comma separated'), h('input', { id: 'np-tags', name: 'tags', class: 'input', placeholder: 'routing, state' })),
    h('div', { class: 'field' }, h('label', { for: 'np-body' }, 'Body'), h('textarea', { id: 'np-body', name: 'body', class: 'textarea', rows: 8, required: true }), errors.body),
    h('div', { class: 'cluster' },
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Publish'),
      h('a', { class: 'btn btn--ghost', href: lastListHref }, 'Cancel'),
    ),
    status,
  );
  mount(root, form);
  form.elements.namedItem('title').focus();

  async function submit(event) {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    for (const el of Object.values(errors)) el.textContent = '';
    button.disabled = true;
    status.textContent = 'Publishing…';
    try {
      const created = await postJSON('/api/posts', Object.fromEntries(new FormData(form)));
      invalidate('/api/posts'); // list and tag caches are stale now
      toast('Published', { type: 'success' });
      navigate(`/posts/${created.id}`);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) return loginRedirect();
      if (err instanceof HttpError && err.status === 400 && err.body?.errors) {
        for (const [name, text] of Object.entries(err.body.errors)) if (errors[name]) errors[name].textContent = text;
        status.textContent = 'Fix the highlighted fields.';
      } else {
        status.textContent = 'Publishing failed. Try again.';
      }
      button.disabled = false;
    }
  }
}

// ---------------------------------------------------------------- 404
function notFoundView({ root }) {
  setTitle('Not found');
  mount(root,
    h('div', { class: 'notice notice--warning' },
      h('p', null, h('strong', null, 'Nothing here.'), ` The route ${location.hash || '#/'} does not exist.`),
      h('a', { href: '#/' }, 'Go to all posts'),
    ),
  );
}
