import './common-2.css';
import { h, mount } from '../lib/dom.js';
import { getJSON, postJSON } from '../lib/api.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);
const state = { version: 0, id: 3, parts: {}, errors: {}, pending: 0, t0: performance.now() };
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${((performance.now() - state.t0) / 1000).toFixed(2)}s ${text}`));

// Each source is a function; "related" depends on "post" (a waterfall the cache deduplicates).
const sources = {
  post: () => getJSON(`/api/posts/${state.id}`),
  related: async () => {
    const post = await getJSON(`/api/posts/${state.id}`);
    const { items } = await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`);
    return items.filter((p) => p.id !== post.id).slice(0, 3);
  },
  status: async () => {
    const res = await fetch('/api/flaky');
    if (!res.ok) throw new Error(`status answered ${res.status}`);
    return res.json();
  },
};

function load(id) {
  const version = ++state.version;
  state.id = id;
  state.parts = {};
  state.errors = {};
  state.t0 = performance.now();
  log(`load post ${id}, request version ${version}`);
  if (!$('atomic').checked) paint(); // stream mode shows placeholders immediately
  else $('view').classList.add('stale');
  run(version, Object.keys(sources));
}

async function run(version, keys) {
  for (const key of keys) state.errors[key] = null;
  await Promise.allSettled(keys.map(async (key) => {
    try {
      const value = await sources[key]();
      if (version !== state.version) return log(`${key}: stale response dropped`, 'err');
      state.parts[key] = value;
      log(`${key}: ready`, 'ok');
      if (!$('atomic').checked) paint();
    } catch (err) {
      if (version !== state.version) return;
      state.errors[key] = err;
      log(`${key}: failed (${err.message})`, 'err');
      if (!$('atomic').checked) paint();
    }
  }));
  if (version !== state.version) return;
  $('view').classList.remove('stale');
  paint();
  log($('atomic').checked ? 'committed in one paint' : 'all sources settled');
}

function part(key, title, render) {
  const value = state.parts[key];
  const err = state.errors[key];
  return h('section', { class: 'panel stack' },
    h('h2', { style: { fontSize: '1rem', margin: 0 } }, title),
    err
      ? h('div', { class: 'notice notice--error' }, h('p', null, `Failed: ${err.message}`), h('button', { class: 'btn btn--sm', type: 'button', onclick: () => run(state.version, [key]) }, `Retry ${key} only`))
      : value === undefined ? h('p', { class: 'skeleton', style: { height: '3rem' } }, ' ') : render(value),
  );
}

function paint() {
  mount($('view'),
    part('post', 'Post', (post) => h('div', null,
      h('p', null, h('strong', null, post.title)),
      h('p', { class: 'muted' }, post.excerpt),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: () => like(post) }, `${post.liked ? 'Liked' : 'Like'} (${post.likes})`),
    )),
    part('related', 'Related', (items) => h('ul', null, items.map((p) => h('li', null, p.title)))),
    part('status', 'Status (flaky)', (s) => h('p', null, `Server value ${s.value}`)),
  );
  $('lane').textContent = state.pending ? `${state.pending} optimistic update${state.pending === 1 ? '' : 's'} pending` : '';
}

// Optimistic lane: paint the intended result now, reconcile with the server later, roll back on refusal.
async function like(post) {
  const before = { liked: post.liked, likes: post.likes };
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  state.pending++;
  paint();
  try {
    Object.assign(post, await postJSON(`/api/posts/${post.id}/like`, {}));
    log('like confirmed', 'ok');
  } catch (err) {
    Object.assign(post, before);
    log(`like rolled back: ${err.message}`, 'err');
    toast('Like rolled back', { type: 'error' });
  } finally {
    state.pending--;
    paint();
  }
}

mount($('post'), Array.from({ length: 14 }, (_, i) => h('option', { value: i + 1, selected: i + 1 === state.id }, `Post ${i + 1}`)));
$('post').addEventListener('change', (e) => load(Number(e.target.value)));
$('atomic').addEventListener('change', () => load(state.id));
load(state.id);
