import { h, mount, formatDate } from '../lib/dom.js';

const list = document.getElementById('list');

async function load() {
  list.setAttribute('aria-busy', 'true');
  mount(list, h('p', { class: 'muted' }, 'Loading posts…'));
  try {
    const res = await fetch('/api/posts?limit=6');
    if (!res.ok) throw new Error(`The server answered ${res.status}`);
    const { items } = await res.json();
    mount(list, h('ul', { class: 'stack' }, items.map((post) =>
      h('li', null,
        h('a', { href: `/dynamic/heavy.html#/posts/${post.id}` }, post.title),
        h('p', { class: 'muted', style: { marginBottom: 0 } }, `${post.author}, ${formatDate(post.date)}`),
      ),
    )));
  } catch (err) {
    mount(list, h('div', { class: 'notice notice--error', role: 'alert' },
      h('p', null, `Could not load posts. ${err.message}.`),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: load }, 'Try again'),
    ));
  } finally {
    list.removeAttribute('aria-busy');
  }
}
load();
