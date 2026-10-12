// The mock API is the contract every port talks to, so its behaviour is pinned here: the Vite plugin's
// middleware is mounted on a plain Node server and exercised with fetch.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockApi } from '../scripts/mock-api.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let server, base, handler;

before(async () => {
  mockApi().configureServer({ config: { root }, middlewares: { use: (fn) => (handler = fn) } });
  server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end('no route'); }));
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const json = async (path, init) => { const res = await fetch(base + path, init); return { res, body: await res.json().catch(() => null) }; };
const post = (path, body, headers = {}) => json(path, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', ...headers }, body: JSON.stringify(body) });

test('posts: paginated list without bodies, one post with its body, 404 for a missing id, Server-Timing on every answer', async () => {
  const { res, body } = await json('/api/posts?limit=3&page=2');
  assert.equal(res.status, 200);
  assert.equal(body.items.length, 3);
  assert.equal(body.page, 2);
  assert.ok(!('body' in body.items[0]), 'list items carry no body');
  assert.match(res.headers.get('server-timing'), /^api;desc="mock api";dur=/);
  const one = await json(`/api/posts/${body.items[0].id}`);
  assert.ok(one.body.body.length > 0);
  assert.equal((await json('/api/posts/99999')).res.status, 404);
});

test('contact: validation errors as JSON for fetch, as a page for a plain form; the honeypot drops silently', async () => {
  const bad = await post('/api/contact', { name: 'A', email: 'nope', topic: 'x', message: 'short', consent: true });
  assert.equal(bad.res.status, 400);
  assert.deepEqual(Object.keys(bad.body.errors).sort(), ['consent', 'email', 'message', 'name', 'topic'].filter((k) => k !== 'consent').sort());
  const serverOnly = await post('/api/contact', { name: 'Ada', email: 'ada@example.com', topic: 'sales', message: 'long enough message', consent: true });
  assert.equal(serverOnly.body.errors.email, 'Addresses at example.com are rejected (server-only rule).');
  const ok = await post('/api/contact', { name: 'Ada', email: 'ada@company.test', topic: 'sales', message: 'long enough message', consent: true });
  assert.equal(ok.res.status, 201);
  assert.match(ok.body.id, /^MSG-/);
  const spam = await post('/api/contact', { website: 'http://spam', name: 'x' });
  assert.equal(spam.body.id, 'SPAM');
  const page = await fetch(base + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' }, body: 'name=A' });
  assert.equal(page.status, 400);
  assert.match(await page.text(), /<h1>Please check the form<\/h1>/);
});

test('session: login sets a cookie, /api/me reads it, publishing needs it, logout clears it', async () => {
  assert.equal((await post('/api/posts', { title: 'Hello there', body: 'twenty characters at least here' })).res.status, 401);
  assert.equal((await post('/api/login', { email: 'ada@company.test', password: 'wrong' })).res.status, 401);
  const login = await post('/api/login', { email: 'ada@company.test', password: 'demo' });
  assert.equal(login.res.status, 200);
  const cookie = login.res.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /^session=/);
  const me = await json('/api/me', { headers: { cookie } });
  assert.equal(me.body.email, 'ada@company.test');
  const bad = await post('/api/posts', { title: 'Hi', body: 'short' }, { cookie });
  assert.equal(bad.res.status, 400);
  assert.deepEqual(Object.keys(bad.body.errors).sort(), ['body', 'title']);
  const created = await post('/api/posts', { title: 'Hello there', body: 'twenty characters at least here', tags: 'a, B' }, { cookie });
  assert.equal(created.res.status, 201);
  assert.deepEqual(created.body.tags, ['a', 'b']);
  assert.equal(created.body.likes, 0, 'created posts carry like counters');
  await post('/api/logout', {}, { cookie });
  assert.equal((await json('/api/me', { headers: { cookie } })).res.status, 401);
});

test('rpc: a batch answers per call, including validation and unknown-function errors', async () => {
  const { body } = await post('/api/rpc', [{ fn: 'serverTime' }, { fn: 'slowSquare', args: { n: 3 } }, { fn: 'publish', args: { title: 'x', body: 'y' } }, { fn: 'nope' }]);
  assert.equal(body.length, 4);
  assert.match(body[0].result.time, /T/);
  assert.equal(body[1].result.square, 9);
  assert.equal(body[2].status, 401, 'publish needs a session');
  assert.equal(body[3].status, 404);
  const single = await post('/api/rpc', { fn: 'serverTime' });
  assert.ok(single.body.result.time, 'a single call answers with one object');
});

test('sync: idempotent replays, version conflicts, and the change feed', async () => {
  const first = await json('/api/sync?since=0');
  assert.equal(first.body.changes.length, 3, 'three seeded notes');
  const version = first.body.version;
  const op = { opId: 'op-1', type: 'put', note: { id: 'n1', text: 'edited' }, baseVersion: 1 };
  const pushed = await post('/api/sync', { client: 'test', ops: [op] });
  assert.equal(pushed.body.applied.length, 1);
  assert.equal(pushed.body.version, version + 1);
  const replay = await post('/api/sync', { client: 'test', ops: [op] });
  assert.equal(replay.body.version, version + 1, 'replaying the same opId changes nothing');
  const stale = await post('/api/sync', { client: 'other', ops: [{ opId: 'op-2', type: 'put', note: { id: 'n1', text: 'stale' }, baseVersion: 1 }] });
  assert.equal(stale.body.rejected[0].reason, 'conflict');
  assert.equal(stale.body.rejected[0].server.text, 'edited');
  const since = await json(`/api/sync?since=${version}`);
  assert.equal(since.body.changes.length, 1);
});

test('csrf: the double-submit token must match the cookie', async () => {
  const issued = await json('/api/csrf');
  const cookie = issued.res.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/api/secure-action', { value: 1 })).res.status, 403);
  assert.equal((await post('/api/secure-action', { value: 1 }, { cookie, 'x-csrf-token': 'wrong' })).res.status, 403);
  const ok = await post('/api/secure-action', { value: 1 }, { cookie, 'x-csrf-token': issued.body.token });
  assert.equal(ok.res.status, 200);
  assert.equal(ok.body.value, 1);
});

test('fragments, errors, status and the app-shell rewrite', async () => {
  const fragment = await fetch(base + '/api/fragment/status');
  assert.match(await fragment.text(), /<section id="status-card"/);
  const report = await post('/api/errors', { kind: 'test', message: 'x' });
  assert.equal(report.res.status, 202);
  assert.ok((await json('/api/status')).body.online >= 40);
  const shell = await fetch(base + '/navigation/app/posts/1');
  assert.equal(shell.status, 404, 'the rewrite hands /navigation/app/* to the next handler as /navigation/heavy.html');
  assert.equal(await shell.text(), 'no route');
});
