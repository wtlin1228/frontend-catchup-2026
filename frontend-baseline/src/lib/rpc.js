// Server functions over one endpoint. Calls issued in the same tick are batched into one request,
// identical in-flight calls are shared, and `live` subscribes to a function's value over SSE.
// Frameworks generate this from `server$`/`createServerFn`/remote functions; here it is explicit.
const pending = [];
const inflight = new Map();
let flushTimer = null;
export const metrics = { requests: 0, calls: 0 };

function flush() {
  const batch = pending.splice(0);
  flushTimer = null;
  metrics.requests++;
  metrics.calls += batch.length;
  fetch('/api/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(batch.map((b) => b.call)),
  })
    .then((res) => res.json())
    .then((results) => batch.forEach((b, i) => {
      const out = results[i] ?? { error: 'No result' };
      if (out.error) b.reject(Object.assign(new Error(out.error), { status: out.status }));
      else b.resolve(out.result);
    }))
    .catch((err) => batch.forEach((b) => b.reject(err)));
}

export function rpc(fn, args = {}) {
  const key = `${fn}:${JSON.stringify(args)}`;
  if (inflight.has(key)) return inflight.get(key);
  const promise = new Promise((resolve, reject) => {
    pending.push({ call: { fn, args }, resolve, reject });
    if (!flushTimer) flushTimer = setTimeout(flush, 0);
  });
  inflight.set(key, promise);
  const done = () => inflight.delete(key);
  promise.then(done, done);
  return promise;
}

export function live(fn, onValue) {
  const source = new EventSource(`/api/rpc/live?fn=${encodeURIComponent(fn)}`);
  source.addEventListener('value', (e) => onValue(JSON.parse(e.data)));
  return () => source.close();
}
