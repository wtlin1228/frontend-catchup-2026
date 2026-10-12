import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rpc, metrics } from '../src/lib/rpc.js';

// A fetch that records what the client sent and answers like scripts/mock-api.js's /api/rpc.
const calls = [];
globalThis.fetch = async (url, init) => {
  const batch = JSON.parse(init.body);
  calls.push({ url, batch });
  return { json: async () => batch.map(({ fn, args }) => (fn === 'fail' ? { error: 'nope', status: 400 } : { result: { fn, args } })) };
};
const tick = () => new Promise((r) => setTimeout(r, 5));

test('rpc: same-tick calls travel in one request and identical in-flight calls are shared', async () => {
  const [a, b, c] = await Promise.all([rpc('serverTime'), rpc('slowSquare', { n: 2 }), rpc('serverTime')]);
  assert.equal(calls.length, 1, 'one request');
  assert.equal(calls[0].url, '/api/rpc');
  assert.equal(calls[0].batch.length, 2, 'the duplicate serverTime was deduplicated');
  assert.deepEqual(a, { fn: 'serverTime', args: {} });
  assert.deepEqual(b, { fn: 'slowSquare', args: { n: 2 } });
  assert.deepEqual(c, a);
  assert.equal(metrics.requests, 1);
  assert.equal(metrics.calls, 2);
});

test('rpc: a later tick is a new request, and per-call errors reject only that call', async () => {
  await tick();
  const results = await Promise.allSettled([rpc('serverTime'), rpc('fail')]);
  assert.equal(calls.length, 2);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[1].reason.message, 'nope');
  assert.equal(results[1].reason.status, 400);
});
