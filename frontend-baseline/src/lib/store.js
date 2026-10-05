// State management. Immutable snapshots + subscriptions, the shape most libraries converge on
// (Redux, Zustand, Pinia, Svelte stores). Frameworks with signals replace the whole thing.

export function createStore(initial, { persistKey, storage = globalThis.localStorage } = {}) {
  let state = initial;
  if (persistKey && storage) {
    try {
      const raw = storage.getItem(persistKey);
      if (raw) state = { ...initial, ...JSON.parse(raw) };
    } catch { /* corrupt or unavailable storage: start fresh */ }
  }
  const listeners = new Set();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? next(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      if (persistKey && storage) {
        try { storage.setItem(persistKey, JSON.stringify(state)); } catch { /* quota */ }
      }
      for (const fn of listeners) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Undo/redo on top of any store. `replace` bypasses history (for external sync). */
export function withHistory(store, { limit = 100 } = {}) {
  const past = [];
  const future = [];
  const base = store.set;
  return {
    ...store,
    set(next) {
      past.push(store.get());
      if (past.length > limit) past.shift();
      future.length = 0;
      base(next);
    },
    replace: base,
    undo() {
      if (!past.length) return;
      future.push(store.get());
      base(past.pop());
    },
    redo() {
      if (!future.length) return;
      past.push(store.get());
      base(future.pop());
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}

/** Derived state: run `cb` only when `selector(state)` changes. */
export function select(store, selector, cb, equals = Object.is) {
  let prev = selector(store.get());
  cb(prev);
  return store.subscribe((state) => {
    const next = selector(state);
    if (!equals(next, prev)) {
      prev = next;
      cb(next);
    }
  });
}
