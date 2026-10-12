// `pnpm test`: Node's built-in runner, no dependencies. These cover the shared library a framework replaces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, withHistory, select } from '../src/lib/store.js';

const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };

test('createStore: get, set with a value or a function, subscribe, no-op on identical state', () => {
  const store = createStore({ n: 1 });
  const seen = [];
  const stop = store.subscribe((s) => seen.push(s.n));
  store.set({ n: 2 });
  store.set((s) => ({ n: s.n + 1 }));
  store.set(store.get()); // Object.is: no notification
  assert.deepEqual(seen, [2, 3]);
  stop();
  store.set({ n: 9 });
  assert.deepEqual(seen, [2, 3]);
  assert.equal(store.get().n, 9);
});

test('createStore: persists to storage and restores over the initial state', () => {
  const storage = memoryStorage();
  const a = createStore({ n: 1, extra: true }, { persistKey: 'k', storage });
  a.set({ n: 5 });
  assert.equal(storage.getItem('k'), '{"n":5}');
  const b = createStore({ n: 1, extra: true }, { persistKey: 'k', storage });
  assert.deepEqual(b.get(), { n: 5, extra: true });
  storage.setItem('k', '{not json');
  assert.deepEqual(createStore({ n: 1 }, { persistKey: 'k', storage }).get(), { n: 1 }, 'corrupt storage starts fresh');
});

test('withHistory: undo and redo, redo cleared by a new change, replace bypasses history, limit', () => {
  const store = withHistory(createStore({ n: 0 }), { limit: 3 });
  for (const n of [1, 2, 3, 4]) store.set({ n });
  assert.equal(store.get().n, 4);
  store.undo(); store.undo(); store.undo();
  assert.equal(store.get().n, 1, 'three steps of history were kept');
  store.undo();
  assert.equal(store.get().n, 1, 'the fourth is past the limit');
  store.redo();
  assert.equal(store.get().n, 2);
  assert.equal(store.canRedo, true);
  store.set({ n: 10 });
  assert.equal(store.canRedo, false, 'a new change clears the redo stack');
  store.replace({ n: 99 });
  assert.equal(store.get().n, 99);
  store.undo();
  assert.equal(store.get().n, 2, 'replace did not push history');
});

test('select: fires once on subscribe and then only when the selected value changes', () => {
  const store = createStore({ a: 1, b: 1 });
  const seen = [];
  select(store, (s) => s.a, (a) => seen.push(a));
  store.set({ a: 1, b: 2 });
  store.set({ a: 2, b: 2 });
  assert.deepEqual(seen, [1, 2]);
});
