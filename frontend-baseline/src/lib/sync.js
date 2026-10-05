// A small sync client: optimistic local writes, an outbox replayed when the network is back,
// versions for conflict detection, and a live feed of other clients' changes.
// Stands in for TanStack DB, Electric, Zero, LiveStore and friends.
import { uid } from './dom.js';

export function createSyncClient({ storageKey, onChange }) {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') ?? {};
  const clientId = saved.clientId ?? uid('client');
  const notes = new Map(Object.entries(saved.notes ?? {}));
  let outbox = saved.outbox ?? [];
  let version = saved.version ?? 0;
  const conflicts = [];
  let pushing = false;
  let source = null;

  const persist = () => localStorage.setItem(storageKey, JSON.stringify({ clientId, version, outbox, notes: Object.fromEntries(notes) }));
  const emit = () => { persist(); onChange?.(client); };

  function apply(change, { own = false } = {}) {
    if (change.type === 'put') {
      const local = notes.get(change.note.id);
      if (!own && local?.pending) return; // keep an unsynced local edit; the push will decide
      notes.set(change.note.id, { ...change.note, pending: false });
    } else if (change.type === 'delete') {
      notes.delete(change.id);
    }
    version = Math.max(version, change.version);
  }

  const client = {
    clientId,
    get notes() { return [...notes.values()].sort((a, b) => a.id.localeCompare(b.id)); },
    get outbox() { return outbox; },
    get version() { return version; },
    get conflicts() { return conflicts; },
    put(id, text) {
      const current = notes.get(id);
      const note = { id, text, version: current?.version ?? 0, pending: true, updatedBy: clientId };
      notes.set(id, note);
      outbox.push({ opId: uid('op'), type: 'put', note: { id, text }, baseVersion: current?.version ?? null });
      emit();
      return client.push();
    },
    remove(id) {
      notes.delete(id);
      outbox.push({ opId: uid('op'), type: 'delete', id });
      emit();
      return client.push();
    },
    async push() {
      if (pushing || !outbox.length || !navigator.onLine) return false;
      pushing = true;
      try {
        const res = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ops: outbox, client: clientId }) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { applied, rejected } = await res.json();
        for (const change of applied) apply(change, { own: true });
        for (const r of rejected) {
          const mine = outbox.find((op) => op.opId === r.opId);
          conflicts.push({ id: r.id, mine: mine?.note?.text ?? '', theirs: r.server.text, server: r.server });
        }
        const handled = new Set([...applied.map((c) => c.opId), ...rejected.map((r) => r.opId)]);
        outbox = outbox.filter((op) => !handled.has(op.opId));
        emit();
        return true;
      } catch {
        emit(); // still offline or server down: the outbox stays
        return false;
      } finally {
        pushing = false;
      }
    },
    async pull() {
      const res = await fetch(`/api/sync?since=${version}`);
      const { changes } = await res.json();
      for (const change of changes) apply(change);
      emit();
    },
    resolve(conflict, choice) {
      const index = conflicts.indexOf(conflict);
      if (index >= 0) conflicts.splice(index, 1);
      if (choice === 'mine') {
        notes.set(conflict.id, { ...conflict.server, text: conflict.mine, pending: true });
        outbox.push({ opId: uid('op'), type: 'put', note: { id: conflict.id, text: conflict.mine }, baseVersion: conflict.server.version });
      } else {
        notes.set(conflict.id, { ...conflict.server, pending: false });
      }
      emit();
      return client.push();
    },
    subscribe() {
      source?.close();
      source = new EventSource('/api/sync/stream');
      source.addEventListener('change', (e) => {
        const change = JSON.parse(e.data);
        if (change.note?.updatedBy === clientId) return; // our own write, already applied
        apply(change);
        emit();
      });
      return () => source.close();
    },
  };
  window.addEventListener('online', () => client.push());
  return client;
}
