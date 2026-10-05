import './state-light.css';
import { h, mount, uid } from '../lib/dom.js';

const KEY = 'todo:v1';
let items = JSON.parse(localStorage.getItem(KEY) ?? '[]');
let filter = 'all';
const list = document.getElementById('todo-list');
const count = document.getElementById('todo-count');

function save() {
  localStorage.setItem(KEY, JSON.stringify(items));
  render();
}
function render() {
  const shown = items.filter((t) => filter === 'all' || (filter === 'done') === t.done);
  mount(list, shown.length
    ? shown.map((t) =>
        h('li', { class: t.done ? 'done' : '' },
          h('input', { type: 'checkbox', id: t.id, checked: t.done, onchange: () => { t.done = !t.done; save(); } }),
          h('label', { for: t.id }, t.title),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-label': `Remove ${t.title}`, onclick: () => { items = items.filter((x) => x !== t); save(); } }, 'Remove'),
        ))
    : h('li', { class: 'muted' }, filter === 'all' ? 'Nothing to do. Add something above.' : `No ${filter} items.`));
  const left = items.filter((t) => !t.done).length;
  count.textContent = `${left} of ${items.length} left`;
}

document.getElementById('todo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('todo-input');
  items.push({ id: uid('todo'), title: input.value.trim(), done: false });
  input.value = '';
  save();
});
for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    for (const b of document.querySelectorAll('[data-filter]')) b.setAttribute('aria-pressed', String(b === button));
    render();
  });
}
render();
