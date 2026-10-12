import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getJSON, postJSON, prefetch, invalidate, HttpError } from '../src/lib/api.js';

let requests = [];
let answer = (url) => ({ ok: true, status: 200, json: async () => ({ url }) });
globalThis.fetch = async (url, init) => { requests.push({ url, init }); return answer(url, init); };
const tick = () => new Promise((r) => setTimeout(r, 1));

test('getJSON: concurrent callers share one request and the cache holds within the TTL', async () => {
  const [a, b] = await Promise.all([getJSON('/api/posts'), getJSON('/api/posts')]);
  assert.deepEqual(a, b);
  assert.equal(requests.length, 1);
  await getJSON('/api/posts');
  assert.equal(requests.length, 1, 'served from the cache');
  await getJSON('/api/posts', { fresh: true });
  assert.equal(requests.length, 2, 'fresh bypasses the cache');
  assert.equal(requests[0].init.headers.accept, 'application/json');
});

test('invalidate: by prefix, so a mutation can drop a family of cached URLs', async () => {
  requests = [];
  await getJSON('/api/posts?page=1');
  await getJSON('/api/me');
  invalidate('/api/posts');
  await getJSON('/api/posts?page=1');
  await getJSON('/api/me');
  assert.equal(requests.length, 3, 'only the posts URL was refetched');
});

test('failures are not cached and carry the status and body as an HttpError', async () => {
  requests = [];
  answer = () => ({ ok: false, status: 404, json: async () => ({ error: 'Post not found' }) });
  await assert.rejects(getJSON('/api/posts/999'), (err) => err instanceof HttpError && err.status === 404 && err.message === 'Post not found' && err.body.error === 'Post not found');
  await tick();
  answer = (url) => ({ ok: true, status: 200, json: async () => ({ url }) });
  await getJSON('/api/posts/999');
  assert.equal(requests.length, 2, 'the failed response was not cached');
});

test('postJSON sends JSON with the right headers; prefetch swallows errors', async () => {
  requests = [];
  await postJSON('/api/login', { email: 'a@b.co', password: 'demo' });
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers['content-type'], 'application/json');
  assert.equal(requests[0].init.body, '{"email":"a@b.co","password":"demo"}');
  answer = () => { throw new Error('offline'); };
  prefetch('/api/x');
  await tick();
  answer = (url) => ({ ok: true, status: 200, json: async () => ({ url }) });
});
