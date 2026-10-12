// Interactive flows: each one drives a page the way a person would and asserts the outcome.
//   node flows.mjs <baseUrl> [nameFilter]        as a script ("state" runs only the flows whose name contains it)
//   import { runFlows } from './flows.mjs'        from compare.mjs
// A flow's name starts with the page it drives ("forms heavy: ..."); `requires` lists other pages it visits,
// so a partial port only runs the flows its pages can support.
import { isExpectedConsole, isHeadlessNoise, isMain, launch } from './lib.mjs';

export const FLOWS = [];
let base = '';
const flow = (name, fn, requires = []) => FLOWS.push({ name, fn, requires });
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

/** The page a flow drives, as a site path: "forms heavy: ..." -> "/forms/heavy.html". */
export const flowPage = (name) => { const [pattern, variant] = name.split(':')[0].split(' '); return `/${pattern}/${variant}.html`; };

/** Run the flows on `base`; returns [{ name, ok, error }]. `has(path)` says which pages exist; `only` filters by name. */
export async function runFlows(baseUrl, { only = '', has = () => true, context: shared } = {}) {
  base = baseUrl;
  const own = shared ? null : await launch();
  const context = shared ?? own.context;
  const results = [];
  for (const { name, fn, requires } of FLOWS) {
    if (only && !name.includes(only)) continue;
    if (![flowPage(name), ...requires].every(has)) continue;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => { if (!isHeadlessNoise(String(err))) errors.push(`pageerror: ${String(err).slice(0, 200)}`); });
    page.on('console', (msg) => { if (msg.type() === 'error' && !isExpectedConsole(msg.text())) errors.push(`console.error: ${msg.text().slice(0, 200)}`); });
    try {
      await fn(page);
      if (errors.length) throw new Error(errors.join(' | '));
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: String(err.message ?? err).slice(0, 400) });
    }
    await page.close();
  }
  await own?.browser.close();
  return results;
}

flow('forms heavy: submit valid form via fetch', async (page) => {
  await page.goto(`${base}/forms/heavy.html`);
  await page.fill('#name', 'Ada Lovelace');
  await page.fill('#email', 'ada@company.test');
  await page.selectOption('#topic', 'support');
  await page.fill('#message', 'This is a sufficiently long message.');
  await page.check('#consent');
  await page.click('#send');
  await page.waitForSelector('#contact-success:not([hidden])', { timeout: 8000 });
  const ticket = await page.textContent('#ticket-id');
  expect(/^MSG-/.test(ticket), `ticket id ${ticket}`);
});

flow('forms heavy: server-only error maps to field', async (page) => {
  await page.goto(`${base}/forms/heavy.html`);
  await page.fill('#name', 'Ada Lovelace');
  await page.fill('#email', 'ada@example.com');
  await page.selectOption('#topic', 'support');
  await page.fill('#message', 'This is a sufficiently long message.');
  await page.check('#consent');
  await page.click('#send');
  await page.waitForFunction(() => document.getElementById('email-error').textContent.length > 0, null, { timeout: 8000 });
  expect((await page.getAttribute('#email', 'aria-invalid')) === 'true', 'email not marked invalid');
});

flow('dynamic heavy: list, search, detail, back', async (page) => {
  await page.goto(`${base}/dynamic/heavy.html`);
  await page.waitForSelector('.post-card:not(.post-card--skeleton)', { timeout: 8000 });
  expect((await page.title()).startsWith('All posts'), `title ${await page.title()}`);
  await page.fill('input[type=search]', 'state');
  await page.waitForFunction(() => location.hash.includes('q=state'), null, { timeout: 5000 });
  await page.waitForSelector('.post-card:not(.post-card--skeleton)', { timeout: 8000 });
  await page.click('.post-card__title a');
  await page.waitForSelector('.post__title', { timeout: 8000 });
  expect(await page.$('button[aria-pressed]'), 'no like button');
  await page.click('.post a[href^="#/"]');
  await page.waitForSelector('.post-card:not(.post-card--skeleton)', { timeout: 8000 });
  expect((await page.inputValue('input[type=search]')) === 'state', 'search not restored');
});

flow('dynamic heavy: guarded route redirects to login', async (page) => {
  await page.goto(`${base}/dynamic/heavy.html#/new`);
  await page.waitForURL(/account\/heavy\.html\?next=/, { timeout: 8000 });
  expect(await page.isVisible('#next-notice'), 'next notice hidden');
});

flow('account heavy: login, protected content, logout', async (page) => {
  await page.goto(`${base}/account/heavy.html`);
  await page.fill('#email', 'ada@company.test');
  await page.fill('#password', 'demo');
  await page.click('#login-submit');
  await page.waitForSelector('#profile-panel:not([hidden])', { timeout: 8000 });
  expect((await page.textContent('#profile-name')).includes('ada'), 'profile name');
  await page.click('#logout');
  await page.waitForSelector('#login-panel:not([hidden])', { timeout: 8000 });
});

flow('dynamic heavy: publish a post when signed in, then like it', async (page) => {
  await page.goto(`${base}/account/heavy.html`);
  await page.fill('#email', 'ada@company.test');
  await page.fill('#password', 'demo');
  await page.click('#login-submit');
  await page.waitForSelector('#profile-panel:not([hidden])', { timeout: 8000 });
  await page.goto(`${base}/dynamic/heavy.html#/new`);
  await page.waitForSelector('#np-title', { timeout: 8000 });
  await page.fill('#np-title', 'A post from the smoke test');
  await page.fill('#np-body', 'This body has more than twenty characters in it, promise.');
  await page.click('button[type=submit]');
  await page.waitForSelector('.post__title', { timeout: 8000 });
  const likeText = await page.textContent('button[aria-pressed]');
  expect(/\(\d+\)/.test(likeText), `like button text "${likeText}" (NaN?)`);
  await page.click('button[aria-pressed]');
  await page.waitForTimeout(1500);
  const after = await page.textContent('button[aria-pressed]');
  expect(/\(\d+\)/.test(after), `like button after click "${after}"`);
});

flow('state heavy: add card, undo, stress', async (page) => {
  await page.goto(`${base}/state/heavy.html`);
  await page.fill('#new-card-title', 'Smoke card');
  await page.press('#new-card-title', 'Enter');
  expect(await page.$('.card-item[aria-label="Smoke card"]'), 'card missing');
  await page.click('#undo');
  expect(!(await page.$('.card-item[aria-label="Smoke card"]')), 'undo failed');
  await page.click('#stress');
  const stat = await page.textContent('#stat-count');
  expect(/306 cards/.test(stat), `stat ${stat}`);
});

flow('table heavy: worker generates rows, sort, filter', async (page) => {
  await page.goto(`${base}/table/heavy.html`);
  await page.waitForFunction(() => /50,000 of 50,000/.test(document.getElementById('status').textContent), null, { timeout: 20000 });
  await page.click('#head [role=columnheader] button:has-text("Score")');
  await page.waitForFunction(() => document.querySelector('#head [aria-sort="ascending"]'), null, { timeout: 5000 });
  await page.fill('#filter', 'robotics');
  await page.waitForFunction(() => /of 50,000 rows/.test(document.getElementById('status').textContent) && !/50,000 of/.test(document.getElementById('status').textContent), null, { timeout: 10000 });
  expect((await page.$$('.grid-row[data-index]')).length > 5, 'no rows rendered');
});

flow('content heavy: tag filter highlights and filters', async (page) => {
  await page.goto(`${base}/content/heavy.html`);
  await page.waitForTimeout(500);
  const tag = await page.getAttribute('#tags a:nth-child(2)', 'data-tag');
  await page.click('#tags a:nth-child(2)');
  await page.waitForTimeout(200);
  const current = await page.getAttribute('#tags a:nth-child(2)', 'aria-current');
  expect(current === 'true', `aria-current is "${current}" for tag ${tag}`);
  const bg = await page.$eval('#tags a:nth-child(2)', (a) => getComputedStyle(a).backgroundColor);
  const other = await page.$eval('#tags a:nth-child(1)', (a) => getComputedStyle(a).backgroundColor);
  expect(bg !== other, 'active tag not styled differently');
});

flow('components heavy: palette opens with Ctrl+K and filters', async (page) => {
  await page.goto(`${base}/components/heavy.html`);
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#palette[open]', { timeout: 3000 });
  await page.fill('#palette-input', 'grid');
  const n = await page.$$eval('#palette-list [role=option]', (els) => els.length);
  expect(n === 2, `expected 2 options, got ${n}`);
});

flow('rpc heavy: batch is one request', async (page) => {
  await page.goto(`${base}/rpc/heavy.html`);
  await page.click('#batch');
  await page.waitForFunction(() => /came back in 1 request/.test(document.getElementById('batch-out').textContent), null, { timeout: 8000 });
});

flow('security heavy: raw innerHTML refused, csrf ok and rejected', async (page) => {
  await page.goto(`${base}/security/heavy.html`);
  await page.waitForFunction(() => /token issued/.test(document.getElementById('log').textContent), null, { timeout: 5000 });
  await page.click('#raw-inject');
  expect(/refused/.test(await page.textContent('#log')), 'raw innerHTML not refused');
  await page.click('#render');
  const preview = await page.innerHTML('#preview');
  expect(!/onerror|javascript:|<script/.test(preview), `unsafe content survived: ${preview}`);
  await page.click('#secure button[type=submit]');
  await page.waitForFunction(() => /Accepted/.test(document.getElementById('csrf-out').textContent), null, { timeout: 5000 });
  await page.click('#without');
  await page.waitForFunction(() => /Rejected/.test(document.getElementById('csrf-out').textContent), null, { timeout: 5000 });
});

flow('navigation heavy: intercepted navigation renders a post', async (page) => {
  await page.goto(`${base}/navigation/app/`);
  await page.waitForSelector('#app ul li a', { timeout: 8000 });
  await page.click('#app ul li a');
  await page.waitForSelector('#app article h2', { timeout: 8000 });
  expect(/\/navigation\/app\/posts\/\d+/.test(page.url()), `url ${page.url()}`);
  expect((await page.title()).startsWith('Post'), `title ${await page.title()}`);
});

flow('morph light: typed text survives a morph refresh', async (page) => {
  await page.goto(`${base}/morph/light.html`);
  await page.waitForSelector('#status-note', { timeout: 5000 });
  await page.fill('#status-note', 'keep me');
  await page.waitForTimeout(3500);
  expect((await page.inputValue('#status-note')) === 'keep me', 'typed text lost');
  expect((await page.textContent('#lost')) === '0', 'lost counter incremented');
});

flow('sync heavy: add a note and it syncs', async (page) => {
  await page.goto(`${base}/sync/heavy.html`);
  await page.waitForTimeout(800);
  await page.fill('#text', 'smoke note');
  await page.press('#text', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('#list input')].some((i) => i.value === 'smoke note'), null, { timeout: 5000 });
  await page.waitForFunction(() => /0 changes in the outbox/.test(document.getElementById('status').textContent), null, { timeout: 8000 });
});

flow('forms light: no-JS post returns server page', async (page) => {
  await page.goto(`${base}/forms/light.html`);
  await page.fill('#email', 'ada@company.test');
  await page.click('button[type=submit]');
  await page.waitForSelector('h1:has-text("Subscribed")', { timeout: 8000 });
});

flow('agent light: GET form reaches the posts app route', async (page) => {
  await page.goto(`${base}/agent/light.html`);
  await page.fill('#q', 'state');
  await page.click('button[type=submit]');
  await page.waitForURL(/dynamic\/heavy\.html.*q=state/, { timeout: 8000 });
  await page.waitForFunction(() => location.hash.includes('q=state'), null, { timeout: 5000 });
  await page.waitForSelector('.post-card:not(.post-card--skeleton)', { timeout: 8000 });
});

flow('agent heavy: console calls a tool through the schema check', async (page) => {
  await page.goto(`${base}/agent/heavy.html`);
  await page.waitForSelector('.agent-posts__item', { timeout: 8000 });
  await page.selectOption('#tool', 'list_posts');
  await page.fill('#args', '{"q":"state"}');
  await page.click('#run');
  await page.waitForFunction(() => /"items"/.test(document.getElementById('result').textContent), null, { timeout: 8000 });
  await page.click('#bad');
  await page.waitForFunction(() => /rejected by the schema/.test(document.getElementById('log').textContent), null, { timeout: 5000 });
  expect(/q must be a string/.test(await page.textContent('#result')), `bad args not rejected: ${await page.textContent('#result')}`);
  await page.selectOption('#tool', 'set_theme');
  await page.fill('#args', '{"theme":"dark"}');
  await page.click('#run');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { timeout: 5000 });
});

// Flows that visit a second page say so, so a port without that page skips them instead of failing.
FLOWS.find((f) => f.name.startsWith('dynamic heavy: guarded route')).requires.push('/account/heavy.html');
FLOWS.find((f) => f.name.startsWith('dynamic heavy: publish')).requires.push('/account/heavy.html');
FLOWS.find((f) => f.name.startsWith('agent light')).requires.push('/dynamic/heavy.html');

if (isMain(import.meta.url)) {
  const results = await runFlows(process.argv[2] ?? 'http://localhost:5173', { only: process.argv[3] ?? '' });
  for (const r of results) console.log(r.ok ? `OK   ${r.name}` : `FAIL ${r.name}\n      ${r.error}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} flow(s) failed` : '\nall flows passed');
  process.exit(failed ? 1 : 0);
}
