// Data layer: fetch + in-memory cache with TTL, prefetch and invalidation.
// The small ancestor of TanStack Query / SWR / useFetch / loaders.

const cache = new Map(); // url -> { promise, time }
const TTL = 30_000;

export class HttpError extends Error {
  constructor(status, body) {
    super(body?.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(url, { method = 'GET', body, signal, headers } = {}) {
  const res = await fetch(url, {
    method,
    signal,
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(body !== undefined && { 'content-type': 'application/json' }), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}

/** GET with caching. Concurrent callers share one request. */
export function getJSON(url, { signal, fresh = false } = {}) {
  const hit = cache.get(url);
  if (!fresh && hit && Date.now() - hit.time < TTL) return hit.promise;
  const entry = { time: Date.now() };
  entry.promise = request(url, { signal }).catch((err) => {
    if (cache.get(url) === entry) cache.delete(url); // do not cache failures or aborts
    throw err;
  });
  cache.set(url, entry);
  return entry.promise;
}

export const postJSON = (url, body, options) => request(url, { ...options, method: 'POST', body });

export function prefetch(url) {
  getJSON(url).catch(() => {});
}

export function invalidate(prefix = '') {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
