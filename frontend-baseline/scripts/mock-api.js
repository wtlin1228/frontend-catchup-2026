// Mock API as a Vite plugin. Runs in `vite dev` and `vite preview`.
// It stands in for the server half that meta-frameworks fold into the project
// (loaders, actions, route handlers, middleware). Keep it when porting so results stay comparable.
//
//   GET  /api/posts?q=&tag=&page=&limit=   paginated list (no body field)
//   GET  /api/posts/:id                    one post
//   POST /api/posts                        create (requires session cookie)
//   POST /api/contact                      JSON (fetch) or form-encoded (plain <form>) submission
//   POST /api/login  /api/logout  GET /api/me
//   GET  /api/stream?hz=10                 server-sent events: `metric` and `log` events
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latency = () => 200 + Math.random() * 500; // keeps loading states visible
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOPICS = ['sales', 'support', 'other'];

// Server functions for the RPC pattern: one endpoint, a dispatch table, batched calls.
const RPC = {
  serverTime: async () => ({ time: new Date().toISOString() }),
  status: async () => ({ time: new Date().toISOString(), online: 40 + Math.round(Math.random() * 20) }),
  slowSquare: async ({ n = 2 }) => { await sleep(500); return { n, square: n * n }; },
  searchPosts: async ({ q = '', limit = 5 }, { posts }) => {
    const needle = String(q).trim().toLowerCase();
    return posts.filter((p) => !needle || [p.title, ...p.tags].join(' ').toLowerCase().includes(needle)).slice(0, limit).map(({ body, ...rest }) => rest);
  },
  postById: async ({ id }, { posts }) => {
    const post = posts.find((p) => p.id === Number(id));
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    return post;
  },
  publish: async ({ title = '', body = '' }, { posts, user }) => {
    if (!user) throw Object.assign(new Error('Sign in to publish'), { status: 401 });
    if (title.trim().length < 3) throw new Error('Title: use at least 3 characters');
    if (body.trim().length < 20) throw new Error('Body: use at least 20 characters');
    const post = { id: Math.max(0, ...posts.map((p) => p.id)) + 1, slug: slugify(title), title: title.trim(), excerpt: body.trim().slice(0, 137), body: body.trim(), tags: ['rpc'], author: user.name, date: new Date().toISOString().slice(0, 10), readingMinutes: 1, likes: 0, liked: false };
    posts.push(post);
    return post;
  },
};

export function mockApi({ dataFile = 'public/data/posts.json' } = {}) {
  const sessions = new Map(); // token -> user. In memory: restarting the server signs everyone out.
  const messages = []; // contact submissions
  const errors = []; // error reports from the resilience pattern
  // Sync state for the local-first pattern: a versioned log of changes and the connected live clients.
  const sync = { version: 0, notes: new Map(), log: [], seen: new Map(), clients: new Set() };
  for (const [id, text] of [['n1', 'Port the forms page'], ['n2', 'Measure the grid in a worker'], ['n3', 'Write the Astro sheet']]) {
    const note = { id, text, version: ++sync.version, updatedBy: 'seed' };
    sync.notes.set(id, note);
    sync.log.push({ type: 'put', version: note.version, note });
  }
  let posts; // loaded lazily; created posts live in memory only

  const loadPosts = (root) => (posts ??= JSON.parse(readFileSync(resolve(root, dataFile), 'utf8')).map((p) => ({ likes: (p.id * 7) % 23, liked: false, ...p })));
  const currentUser = (req) => sessions.get(cookies(req).session) ?? null;

  async function handle(req, res, url, root) {
    const { method } = req;
    const path = url.pathname;

    if (method === 'GET' && path === '/api/stream') return stream(req, res, url);

    if (method === 'GET' && path === '/api/status') {
      return json(res, 200, { time: new Date().toISOString(), online: 40 + Math.round(Math.random() * 20), load: Math.round(Math.random() * 100) / 100 });
    }

    if (method === 'POST' && path === '/api/subscribe') {
      const body = await readBody(req);
      const html = wantsHtml(req);
      if (!EMAIL.test(body.email ?? '')) {
        return html
          ? page(res, 400, 'Check the email address', '<p>That does not look like an email address.</p>', '/forms/light.html')
          : json(res, 400, { errors: { email: 'Enter a valid email address.' } });
      }
      await sleep(latency());
      const frequency = body.frequency === 'daily' ? 'daily' : 'weekly';
      return html
        ? page(res, 200, 'Subscribed', `<p>${escapeHtml(body.email)} will get the ${frequency} digest.</p>`, '/forms/light.html')
        : json(res, 201, { ok: true, frequency });
    }

    const like = path.match(/^\/api\/posts\/(\d+)\/like$/);
    if (method === 'POST' && like) {
      await sleep(latency());
      if (Math.random() < 0.3) return json(res, 503, { error: 'Flaky on purpose, try again' }); // exercises optimistic rollback
      const found = loadPosts(root).find((p) => p.id === Number(like[1]));
      if (!found) return json(res, 404, { error: 'Post not found' });
      found.liked = !found.liked;
      found.likes += found.liked ? 1 : -1;
      return json(res, 200, { id: found.id, likes: found.likes, liked: found.liked });
    }

    if (method === 'PUT' && path === '/api/upload') {
      const limit = 5 * 1024 * 1024;
      if (Number(req.headers['content-length'] ?? 0) > limit) {
        req.resume();
        return json(res, 413, { error: 'Files are limited to 5 MB' });
      }
      let size = 0;
      await new Promise((done, reject) => {
        req.on('data', (chunk) => {
          size += chunk.length;
          req.pause(); // throttled on purpose so upload progress is visible on localhost
          setTimeout(() => req.resume(), 40);
        });
        req.on('end', done);
        req.on('error', reject);
      });
      return json(res, 201, { id: `UP-${randomUUID().slice(0, 8).toUpperCase()}`, size, type: req.headers['content-type'] ?? 'application/octet-stream' });
    }

    if (method === 'GET' && path === '/api/posts') {
      await sleep(latency());
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const tag = url.searchParams.get('tag');
      const limit = clamp(Number(url.searchParams.get('limit')) || 8, 1, 50);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      let items = loadPosts(root);
      if (q) items = items.filter((p) => [p.title, p.excerpt, ...p.tags].join(' ').toLowerCase().includes(q));
      if (tag) items = items.filter((p) => p.tags.includes(tag));
      items = [...items].sort((a, b) => b.date.localeCompare(a.date));
      const total = items.length;
      const slice = items.slice((page - 1) * limit, page * limit).map(({ body, ...rest }) => rest);
      return json(res, 200, { items: slice, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    }

    const one = path.match(/^\/api\/posts\/(\d+)$/);
    if (method === 'GET' && one) {
      await sleep(latency());
      const found = loadPosts(root).find((p) => p.id === Number(one[1]));
      return found ? json(res, 200, found) : json(res, 404, { error: 'Post not found' });
    }

    if (method === 'POST' && path === '/api/posts') {
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: 'Sign in to publish' });
      const body = await readBody(req);
      const errors = {};
      if (!body.title || body.title.trim().length < 3) errors.title = 'Use at least 3 characters.';
      if (!body.body || body.body.trim().length < 20) errors.body = 'Use at least 20 characters.';
      if (Object.keys(errors).length) return json(res, 400, { errors });
      await sleep(latency());
      const all = loadPosts(root);
      const text = body.body.trim();
      const created = {
        id: Math.max(0, ...all.map((p) => p.id)) + 1,
        slug: slugify(body.title),
        title: body.title.trim(),
        excerpt: text.length > 140 ? text.slice(0, 137) + '…' : text,
        body: text,
        tags: String(body.tags ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5),
        author: user.name,
        date: new Date().toISOString().slice(0, 10),
        readingMinutes: Math.max(1, Math.round(text.split(/\s+/).length / 200)),
      };
      all.push(created);
      return json(res, 201, created);
    }

    if (method === 'POST' && path === '/api/contact') {
      const body = await readBody(req);
      const html = wantsHtml(req); // plain <form> submit (no JS) vs fetch
      if (body.website) {
        // Honeypot filled in: pretend it worked, drop the message.
        return html ? page(res, 200, 'Message sent', '<p>Thanks, your message was received.</p>') : json(res, 201, { ok: true, id: 'SPAM' });
      }
      const errors = {};
      if (!body.name || body.name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters).';
      if (!EMAIL.test(body.email ?? '')) errors.email = 'Enter a valid email address.';
      if (!TOPICS.includes(body.topic)) errors.topic = 'Choose a topic.';
      if (!body.message || body.message.trim().length < 10) errors.message = 'Write at least 10 characters.';
      if (!['on', 'true', true].includes(body.consent)) errors.consent = 'Consent is required so we can reply.';
      // A rule only the server knows, to exercise server-side error mapping in the client:
      if (/@example\.com$/i.test(body.email ?? '')) errors.email = 'Addresses at example.com are rejected (server-only rule).';
      if (Object.keys(errors).length) {
        // No JS: do what server-rendered frameworks do, re-render the result with the errors.
        return html
          ? page(res, 400, 'Please check the form', `<ul>${Object.values(errors).map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`)
          : json(res, 400, { errors });
      }
      await sleep(latency());
      const id = `MSG-${randomUUID().slice(0, 8).toUpperCase()}`;
      messages.push({ id, ...body, receivedAt: new Date().toISOString() });
      return html ? page(res, 200, 'Message sent', `<p>Your ticket is <code>${id}</code>. Expect a reply within two working days.</p>`) : json(res, 201, { ok: true, id });
    }

    if (method === 'POST' && path === '/api/login') {
      const body = await readBody(req);
      await sleep(latency());
      if (!EMAIL.test(body.email ?? '') || body.password !== 'demo') return json(res, 401, { error: 'Invalid email or password' });
      const token = randomUUID();
      const user = { email: body.email, name: body.email.split('@')[0].replace(/[._-]+/g, ' ') };
      sessions.set(token, user);
      // Not HttpOnly on purpose: the demo client peeks at the cookie to decide what to render before
      // asking /api/me. A real app would set HttpOnly and let the server decide.
      return json(res, 200, user, { 'set-cookie': `session=${token}; Path=/; SameSite=Lax; Max-Age=86400` });
    }
    if (method === 'POST' && path === '/api/logout') {
      sessions.delete(cookies(req).session);
      return json(res, 200, { ok: true }, { 'set-cookie': 'session=; Path=/; SameSite=Lax; Max-Age=0' });
    }
    if (method === 'GET' && path === '/api/me') {
      const user = currentUser(req);
      return user ? json(res, 200, user) : json(res, 401, { error: 'Not signed in' });
    }

    // --- server functions (RPC): one call or a batch array ---
    if (method === 'POST' && path === '/api/rpc') {
      const body = await readBody(req);
      const calls = Array.isArray(body) ? body : [body];
      await sleep(latency());
      const context = { posts: loadPosts(root), user: currentUser(req) };
      const results = await Promise.all(calls.map(async ({ fn, args = {} } = {}) => {
        if (!RPC[fn]) return { error: `Unknown function "${fn}"`, status: 404 };
        try { return { result: await RPC[fn](args, context) }; }
        catch (err) { return { error: err.message, status: err.status ?? 400 }; }
      }));
      return json(res, 200, Array.isArray(body) ? results : results[0]);
    }
    if (method === 'GET' && path === '/api/rpc/live') {
      const fn = url.searchParams.get('fn');
      if (!RPC[fn]) return json(res, 404, { error: 'Unknown function' });
      sseHead(res);
      const tick = async () => { try { res.write(`event: value\ndata: ${JSON.stringify(await RPC[fn]({}, { posts: loadPosts(root), user: currentUser(req) }))}\n\n`); } catch { /* client gone */ } };
      tick();
      const timer = setInterval(tick, 2000);
      req.on('close', () => clearInterval(timer));
      return;
    }

    // --- sync (local-first): change feed, idempotent pushes with version checks, live change events ---
    if (method === 'GET' && path === '/api/sync') {
      const since = Number(url.searchParams.get('since') ?? 0);
      return json(res, 200, { version: sync.version, changes: sync.log.filter((c) => c.version > since) });
    }
    if (method === 'POST' && path === '/api/sync') {
      const { ops = [], client = 'unknown' } = await readBody(req);
      await sleep(latency());
      const applied = [];
      const rejected = [];
      for (const op of ops) {
        if (op.opId && sync.seen.has(op.opId)) { applied.push(sync.seen.get(op.opId)); continue; } // replayed op: idempotent
        let outcome;
        if (op.type === 'put' && op.note?.id) {
          const current = sync.notes.get(op.note.id);
          if (current && op.baseVersion != null && current.version !== op.baseVersion) {
            rejected.push({ opId: op.opId, id: op.note.id, reason: 'conflict', server: current });
            continue;
          }
          const note = { id: op.note.id, text: String(op.note.text ?? ''), version: ++sync.version, updatedBy: client };
          sync.notes.set(note.id, note);
          outcome = { type: 'put', version: note.version, note, opId: op.opId };
        } else if (op.type === 'delete' && op.id) {
          sync.notes.delete(op.id);
          outcome = { type: 'delete', version: ++sync.version, id: op.id, opId: op.opId };
        } else continue;
        sync.log.push(outcome);
        if (op.opId) sync.seen.set(op.opId, outcome);
        applied.push(outcome);
        for (const peer of sync.clients) peer.write(`event: change\ndata: ${JSON.stringify(outcome)}\n\n`);
      }
      return json(res, 200, { version: sync.version, applied, rejected });
    }
    if (method === 'GET' && path === '/api/sync/stream') {
      sseHead(res);
      sync.clients.add(res);
      req.on('close', () => sync.clients.delete(res));
      return;
    }

    // --- server-rendered HTML fragments for the morphing pattern ---
    if (method === 'GET' && path === '/api/fragment/status') {
      const order = [...'ABCDE'].sort(() => Math.random() - 0.5);
      return html(res, `<section id="status-card" class="panel stack">
  <p>Server time <time id="status-time">${new Date().toLocaleTimeString('en-GB')}</time>, <strong id="status-online">${40 + Math.round(Math.random() * 20)}</strong> online. The list below is in a new random order every time.</p>
  <ul id="status-list" class="cluster" style="list-style:none;padding:0">${order.map((k) => `<li id="item-${k}" class="tag">Item ${k}</li>`).join('')}</ul>
  <label>Your note <input id="status-note" class="input" placeholder="Type here, then wait for the next refresh"></label>
</section>`);
    }
    if (method === 'GET' && path === '/api/fragment/stream') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.write('<ul id="stream-list">\n');
      let i = 0;
      const timer = setInterval(() => {
        i++;
        res.write(`<li id="chunk-${i}">Chunk ${i} arrived at ${new Date().toLocaleTimeString('en-GB')}</li>\n`);
        if (i >= 6) { clearInterval(timer); res.end('</ul>'); }
      }, 350);
      req.on('close', () => clearInterval(timer));
      return;
    }

    // --- resilience: error reports and a flaky endpoint ---
    if (method === 'POST' && path === '/api/errors') {
      const report = await readBody(req);
      errors.push({ ...report, at: new Date().toISOString() });
      return json(res, 202, { received: errors.length });
    }
    if (method === 'GET' && path === '/api/flaky') {
      await sleep(latency());
      return Math.random() < 0.5 ? json(res, 500, { error: 'Flaky on purpose' }) : json(res, 200, { ok: true, value: Math.round(Math.random() * 100) });
    }

    // --- security: CSRF double-submit cookie ---
    if (method === 'GET' && path === '/api/csrf') {
      const token = randomUUID();
      return json(res, 200, { token }, { 'set-cookie': `csrf=${token}; Path=/; SameSite=Strict` });
    }
    if (method === 'POST' && path === '/api/secure-action') {
      const body = await readBody(req);
      const cookie = cookies(req).csrf;
      const token = req.headers['x-csrf-token'] ?? body.csrf;
      if (!cookie || token !== cookie) return json(res, 403, { error: 'CSRF check failed: token missing or does not match the cookie' });
      return json(res, 200, { ok: true, value: body.value ?? null });
    }

    json(res, 404, { error: `No route for ${method} ${path}` });
  }

  function attach(server) {
    const root = server.config.root;
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost');
      // Real-path routes for the Navigation API page: the server serves the app shell for any /navigation/app/* URL.
      if (url.pathname.startsWith('/navigation/app')) { req.url = '/navigation/heavy.html'; return next(); }
      if (!url.pathname.startsWith('/api/')) return next();
      // Server-Timing on every API response, for the observability pattern.
      const t0 = performance.now();
      const writeHead = res.writeHead;
      res.writeHead = function (...args) {
        if (!this.headersSent) this.setHeader('server-timing', `api;desc="mock api";dur=${(performance.now() - t0).toFixed(1)}`);
        return writeHead.apply(this, args);
      };
      try {
        await handle(req, res, url, root);
      } catch (err) {
        console.error('[mock-api]', err);
        if (!res.headersSent) json(res, 500, { error: 'Internal error' });
      }
    });
  }

  return { name: 'mock-api', configureServer: attach, configurePreviewServer: attach };
}

// --- server-sent events ---------------------------------------------------
const LOG_LINES = [
  ['info', 'Deploy finished for posts-service'],
  ['info', 'Cache warmed: 128 keys'],
  ['warn', 'p95 latency above 300 ms for 10 s'],
  ['info', 'Autoscaler added 1 replica'],
  ['error', 'Upstream timeout: images-cdn (retrying)'],
  ['info', 'Session store compacted'],
  ['warn', 'Queue depth 4 200 (threshold 4 000)'],
  ['info', 'Nightly export completed'],
];

function stream(req, res, url) {
  const hz = clamp(Number(url.searchParams.get('hz')) || 10, 1, 60);
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write('retry: 1000\n\n');
  const state = { cpu: 40, mem: 55, rps: 120, latency: 80 };
  const walk = (v, step, min, max) => Math.min(max, Math.max(min, v + (Math.random() - 0.5) * step));
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const metrics = setInterval(() => {
    state.cpu = walk(state.cpu, 12, 2, 100);
    state.mem = walk(state.mem, 3, 10, 100);
    state.rps = walk(state.rps, 40, 0, 400);
    state.latency = walk(state.latency, 30, 5, 400);
    send('metric', {
      t: Date.now(),
      cpu: Math.round(state.cpu * 10) / 10,
      mem: Math.round(state.mem * 10) / 10,
      rps: Math.round(state.rps),
      latency: Math.round(state.latency),
    });
  }, Math.round(1000 / hz));
  const logs = setInterval(() => {
    const [level, message] = LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)];
    send('log', { id: randomUUID(), t: Date.now(), level, message });
  }, 1200);
  req.on('close', () => {
    clearInterval(metrics);
    clearInterval(logs);
  });
}

// --- helpers ---------------------------------------------------------------
function sseHead(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 1000\n\n');
}
function html(res, body) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
// Minimal server-rendered page for the no-JavaScript form flow.
function page(res, status, title, body, back = '/forms/heavy.html') {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.5}a{color:#c24f1a}</style></head>
<body><h1>${title}</h1>${body}<p><a href="${back}">Back to the form</a></p></body></html>`);
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(new Error('Body too large'));
    });
    req.on('end', () => {
      const type = req.headers['content-type'] ?? '';
      try {
        if (type.includes('application/json')) return resolvePromise(data ? JSON.parse(data) : {});
        if (type.includes('application/x-www-form-urlencoded')) return resolvePromise(Object.fromEntries(new URLSearchParams(data)));
        resolvePromise({});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k),
  );
}
const wantsHtml = (req) => (req.headers.accept ?? '').includes('text/html');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
