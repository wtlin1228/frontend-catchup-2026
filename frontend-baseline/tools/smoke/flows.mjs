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
  expect(ticket.startsWith('MSG-'), `ticket id ${ticket}`);
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

flow('forms heavy: draft survives a reload, upload gets an id, send another resets', async (page) => {
  await page.goto(`${base}/forms/heavy.html`);
  await page.evaluate(() => sessionStorage.clear());
  await page.fill('#name', 'Grace Hopper');
  await page.fill('#message', 'A draft that should survive a reload.');
  await page.waitForFunction(() => document.getElementById('draft-note').textContent === 'Draft saved', null, { timeout: 5000 });
  await page.reload();
  expect((await page.inputValue('#name')) === 'Grace Hopper', 'draft name not restored');
  expect((await page.textContent('#draft-note')) === 'Draft restored', 'draft note missing after reload');
  expect((await page.textContent('#message-count')) === '37', `message count ${await page.textContent('#message-count')}`);
  // Validation on blur, then live once touched.
  await page.fill('#name', '');
  await page.press('#name', 'Tab');
  await page.waitForFunction(() => document.getElementById('name-error').textContent.length > 0, null, { timeout: 2000 });
  expect((await page.getAttribute('#name', 'aria-invalid')) === 'true', 'name not marked invalid');
  await page.fill('#name', 'Grace Hopper');
  await page.waitForFunction(() => document.getElementById('name-error').textContent === '', null, { timeout: 2000 });
  // The attachment is uploaded as soon as it is chosen and referenced by id.
  await page.setInputFiles('#attachment', { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello from the smoke test') });
  await page.waitForFunction(() => document.getElementById('attachment-id').value.length > 0, null, { timeout: 10000 });
  expect(await page.isVisible('#attachment-status'), 'attachment box hidden');
  // Send, then start over: focus lands on the success button, then on the first field; the draft is gone.
  await page.fill('#email', 'grace@company.test');
  await page.selectOption('#topic', 'sales');
  await page.check('#consent');
  await page.waitForTimeout(500); // let the debounced draft save land before the send clears it
  await page.click('#send');
  await page.waitForSelector('#contact-success:not([hidden])', { timeout: 8000 });
  await page.waitForFunction(() => document.activeElement.id === 'send-another', null, { timeout: 2000 }).catch(() => expect(false, 'focus not on the success button'));
  expect((await page.evaluate(() => sessionStorage.getItem('contact:draft'))) === null, 'draft not cleared after send');
  await page.click('#send-another');
  await page.waitForSelector('#contact-form:not([hidden])', { timeout: 2000 });
  expect((await page.inputValue('#name')) === '', 'name not reset');
  expect((await page.textContent('#message-count')) === '0', 'count not reset');
  await page.waitForFunction(() => document.activeElement.id === 'name', null, { timeout: 2000 }).catch(() => expect(false, 'focus not on the first field'));
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

flow('motion heavy: tiles reorder, add, remove and switch layout; the card springs back', async (page) => {
  await page.goto(`${base}/motion/heavy.html`);
  const order = () => page.$$eval('#tiles .tile', (els) => els.map((e) => e.dataset.id).join(','));
  const sorted = '1,2,3,4,5,6,7,8,9,10,11,12';
  expect((await order()) === sorted, `initial order ${await order()}`);
  await page.click('#shuffle');
  await page.click('#sort');
  await page.waitForFunction((sorted) => [...document.querySelectorAll('#tiles .tile')].map((e) => e.dataset.id).join(',') === sorted, sorted, { timeout: 3000 });
  await page.click('#add');
  await page.waitForFunction(() => document.querySelectorAll('#tiles .tile').length === 13, null, { timeout: 3000 });
  await page.click('#remove');
  await page.waitForFunction(() => document.querySelectorAll('#tiles .tile').length === 12, null, { timeout: 3000 }); // leave animations end first
  await page.click('#layout');
  await page.waitForFunction(() => document.getElementById('tiles').classList.contains('tiles--list'), null, { timeout: 3000 });
  await page.focus('#drag-card');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => /translate\((?!0px)/.test(document.getElementById('drag-card').style.transform), null, { timeout: 2000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => /translate\(0px, 0px\)/.test(document.getElementById('drag-card').style.transform), null, { timeout: 5000 });
});
flow('async light: the latest tab wins and naive mode shows the skeleton', async (page) => {
  await page.goto(`${base}/async/light.html`);
  const settled = () => page.waitForFunction(() => !document.querySelector('#tabs [aria-busy="true"]') && !document.querySelector('#panel .skeleton') && !document.querySelector('#panel.stale') && document.querySelector('#panel ul, #panel p.muted'), null, { timeout: 8000 });
  await settled();
  await page.click('#tabs [role=tab]:nth-child(2)');
  await page.click('#tabs [role=tab]:nth-child(3)');
  expect((await page.getAttribute('#tabs [role=tab]:nth-child(3)', 'aria-selected')) === 'true', 'the third tab is not selected at once');
  await settled();
  const expected = await page.evaluate(async () => (await (await fetch('/api/posts?tag=forms&limit=5')).json()).items.map((p) => String(p.id)));
  const shown = await page.$$eval('#panel a', (links) => links.map((a) => a.getAttribute('href').split('/').pop()));
  expect(JSON.stringify(shown) === JSON.stringify(expected), `panel shows ${shown} for forms, expected ${expected}`);
  await page.uncheck('#transition');
  await page.click('#tabs [role=tab]:nth-child(4)');
  await page.waitForSelector('#panel .skeleton', { timeout: 3000 });
  await settled();
  expect((await page.$$('#log li')).length >= 2, 'the log is empty');
});
flow('async heavy: atomic commit, stale answer dropped, retry alone, optimistic like reconciles', async (page) => {
  await page.goto(`${base}/async/heavy.html`);
  const title = (id) => page.evaluate(async (id) => (await (await fetch(`/api/posts/${id}`)).json()).title, id);
  const settled = () => page.waitForFunction(() => !document.querySelector('#view .skeleton') && !document.querySelector('#view.stale, .stale #view, #view .stale') && document.querySelectorAll('#view section').length === 3 && document.querySelector('#view section strong'), null, { timeout: 15000 });
  await settled();
  expect((await page.textContent('#view section strong')) === (await title(3)), 'post 3 not shown');
  await page.selectOption('#post', '4'); // two changes in flight: only the latest may paint
  await page.selectOption('#post', '5');
  await settled();
  expect((await page.textContent('#view section strong')) === (await title(5)), 'post 5 not shown after a stale answer');
  const statusLines = () => page.$$eval('#log li', (lis) => lis.filter((li) => /status: (ready|failed)/.test(li.textContent)).length);
  for (let i = 0; i < 8 && !(await page.$('#view p:has-text("Server value")')); i++) { // the flaky part fails half the time; retry it alone until it lands
    const seen = await statusLines();
    await page.click('#view button:has-text("Retry")');
    await page.waitForFunction((seen) => [...document.querySelectorAll('#log li')].filter((li) => /status: (ready|failed)/.test(li.textContent)).length > seen, seen, { timeout: 10000 });
    await settled();
  }
  expect(await page.$('#view p:has-text("Server value")'), 'the status part never landed');
  const before = await page.textContent('#view section button');
  await page.click('#view section button:has-text("Like")');
  await page.waitForFunction((before) => document.querySelector('#view section button').textContent !== before, before, { timeout: 2000 }); // optimistic at once
  await page.waitForFunction(() => !document.getElementById('lane').textContent, null, { timeout: 8000 });
  const server = await page.evaluate(async () => { const p = await (await fetch('/api/posts/5')).json(); return `${p.liked ? 'Liked' : 'Like'} (${p.likes})`; });
  expect((await page.textContent('#view section button')) === server, `button shows ${await page.textContent('#view section button')}, the server says ${server}`);
  await page.uncheck('#atomic');
  await page.selectOption('#post', '6');
  await page.waitForSelector('#view .skeleton', { timeout: 3000 }); // stream mode paints placeholders first
  await settled();
  expect((await page.textContent('#view section strong')) === (await title(6)), 'post 6 not shown in stream mode');
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

flow('components heavy: tabs, combobox and menu follow the ARIA patterns', async (page) => {
  await page.goto(`${base}/components/heavy.html`);
  // Tabs: arrow keys move selection and focus; the panel follows.
  await page.focus('#tab-lib');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.getElementById('tab-meta').getAttribute('aria-selected') === 'true' && document.activeElement.id === 'tab-meta' && !document.getElementById('panel-meta').hidden && document.getElementById('panel-lib').hidden, null, { timeout: 2000 });
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.activeElement.id === 'tab-alt' && document.getElementById('tab-alt').tabIndex === 0 && document.getElementById('tab-lib').tabIndex === -1, null, { timeout: 2000 });
  // Combobox: typing filters, ArrowDown moves the active descendant, Enter chooses it.
  await page.fill('#cb', 'svelte');
  await page.waitForFunction(() => document.querySelectorAll('#cb-list [role=option]').length === 2 && document.getElementById('cb').getAttribute('aria-expanded') === 'true', null, { timeout: 2000 });
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.getElementById('cb').getAttribute('aria-activedescendant') === 'cb-list-option-1', null, { timeout: 2000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('cb-result').textContent === 'Chosen: SvelteKit (meta-framework).' && document.getElementById('cb-list').hidden && document.getElementById('cb').value === 'SvelteKit', null, { timeout: 2000 });
  // Menu: opens on the first item, typeahead, Escape closes and returns focus, an outside click closes without it.
  await page.click('#mb');
  await page.waitForFunction(() => !document.getElementById('mb-menu').hidden && document.activeElement.textContent.trim() === 'Rename', null, { timeout: 2000 });
  await page.keyboard.press('d');
  await page.waitForFunction(() => document.activeElement.textContent.trim() === 'Duplicate', null, { timeout: 2000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('mb-menu').hidden && document.activeElement.id === 'mb' && document.getElementById('mb').getAttribute('aria-expanded') === 'false', null, { timeout: 2000 });
  await page.click('#mb');
  await page.waitForFunction(() => !document.getElementById('mb-menu').hidden, null, { timeout: 2000 });
  await page.mouse.click(5, 5);
  await page.waitForFunction(() => document.getElementById('mb-menu').hidden && document.activeElement.id !== 'mb', null, { timeout: 2000 });
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
