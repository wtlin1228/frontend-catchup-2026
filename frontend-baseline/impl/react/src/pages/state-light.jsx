import { useEffect, useState } from 'react';
import { mount } from '../mount.jsx';
import { Layout } from '../Layout.jsx';
import '@baseline/src/pages/state-light.css';

const KEY = 'todo:v1';
const uid = () => `todo_${Math.random().toString(36).slice(2, 9)}`;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

function Todo() {
  const [items, setItems] = useState(load);
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState('');
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const shown = items.filter((t) => filter === 'all' || (filter === 'done') === t.done);
  const left = items.filter((t) => !t.done).length;
  const add = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setItems([...items, { id: uid(), title: draft.trim(), done: false }]);
    setDraft('');
  };
  return (
    <>
      <form id="todo-form" className="cluster" style={{ marginBottom: 'var(--space-4)' }} onSubmit={add}>
        <label htmlFor="todo-input" className="visually-hidden">New item</label>
        <input id="todo-input" className="input" style={{ maxWidth: '24rem' }} placeholder="What needs doing?" required maxLength={80} autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn--primary" type="submit">Add</button>
      </form>
      <div className="cluster" role="group" aria-label="Filter" style={{ marginBottom: 'var(--space-3)' }}>
        {['all', 'active', 'done'].map((f) => (
          <button key={f} className="btn btn--sm" type="button" data-filter={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <ul id="todo-list" className="todo">
        {shown.length ? shown.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <input type="checkbox" id={t.id} checked={t.done} onChange={() => setItems(items.map((x) => (x === t ? { ...x, done: !x.done } : x)))} />
            <label htmlFor={t.id}>{t.title}</label>
            <button className="btn btn--ghost btn--sm" type="button" aria-label={`Remove ${t.title}`} onClick={() => setItems(items.filter((x) => x !== t))}>Remove</button>
          </li>
        )) : <li className="muted">{filter === 'all' ? 'Nothing to do. Add something above.' : `No ${filter} items.`}</li>}
      </ul>
      <p id="todo-count" className="muted">{left} of {items.length} left</p>
    </>
  );
}

mount(
  <Layout pattern="state" variant="light">
    <>
      <h1>To-do</h1>
      <p>Add, complete, remove, filter. State is one array in <code>useState</code>, saved to <code>localStorage</code> by an effect, and React re-renders the list from it. The baseline rebuilds the list by hand; here the reconciler does it.</p>
    </>
    <Todo />
  </Layout>,
);
