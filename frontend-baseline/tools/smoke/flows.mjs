// Interactive flow checks on top of smoke.mjs. Usage: node flows.mjs <baseUrl>
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
let failed = 0;

async function flow(name, fn) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 200)}`));
  page.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource|TrustedHTML/.test(msg.text())) errors.push(`console.error: ${msg.text().slice(0, 200)}`); });
  try {
    await fn(page);
    if (errors.length) throw new Error(errors.join(' | '));
    console.log(`OK   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n      ${String(err.message ?? err).slice(0, 400)}`);
  }
  await page.close();
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

await flow('forms heavy: submit valid form via fetch', async (page) => {
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

await flow('forms heavy: server-only error maps to field', async (page) => {
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

await flow('dynamic heavy: list, search, detail, back', async (page) => {
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

await flow('dynamic heavy: guarded route redirects to login', async (page) => {
  await page.goto(`${base}/dynamic/heavy.html#/new`);
  await page.waitForURL(/account\/heavy\.html\?next=/, { timeout: 8000 });
  expect(await page.isVisible('#next-notice'), 'next notice hidden');
});

await flow('account heavy: login, protected content, logout', async (page) => {
  await page.goto(`${base}/account/heavy.html`);
  await page.fill('#email', 'ada@company.test');
  await page.fill('#password', 'demo');
  await page.click('#login-submit');
  await page.waitForSelector('#profile-panel:not([hidden])', { timeout: 8000 });
  expect((await page.textContent('#profile-name')).includes('ada'), 'profile name');
  await page.click('#logout');
  await page.waitForSelector('#login-panel:not([hidden])', { timeout: 8000 });
});

await flow('dynamic heavy: publish a post when signed in, then like it', async (page) => {
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

await flow('state heavy: add card, undo, stress', async (page) => {
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

await flow('table heavy: worker generates rows, sort, filter', async (page) => {
  await page.goto(`${base}/table/heavy.html`);
  await page.waitForFunction(() => /50,000 of 50,000/.test(document.getElementById('status').textContent), null, { timeout: 20000 });
  await page.click('#head [role=columnheader] button:has-text("Score")');
  await page.waitForFunction(() => document.querySelector('#head [aria-sort="ascending"]'), null, { timeout: 5000 });
  await page.fill('#filter', 'robotics');
  await page.waitForFunction(() => /of 50,000 rows/.test(document.getElementById('status').textContent) && !/50,000 of/.test(document.getElementById('status').textContent), null, { timeout: 10000 });
  expect((await page.$$('.grid-row[data-index]')).length > 5, 'no rows rendered');
});

await flow('content heavy: tag filter highlights and filters', async (page) => {
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

await flow('components heavy: palette opens with Ctrl+K and filters', async (page) => {
  await page.goto(`${base}/components/heavy.html`);
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#palette[open]', { timeout: 3000 });
  await page.fill('#palette-input', 'grid');
  const n = await page.$$eval('#palette-list [role=option]', (els) => els.length);
  expect(n === 2, `expected 2 options, got ${n}`);
});

await flow('rpc heavy: batch is one request', async (page) => {
  await page.goto(`${base}/rpc/heavy.html`);
  await page.click('#batch');
  await page.waitForFunction(() => /came back in 1 request/.test(document.getElementById('batch-out').textContent), null, { timeout: 8000 });
});

await flow('security heavy: raw innerHTML refused, csrf ok and rejected', async (page) => {
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

await flow('navigation heavy: intercepted navigation renders a post', async (page) => {
  await page.goto(`${base}/navigation/app/`);
  await page.waitForSelector('#app ul li a', { timeout: 8000 });
  await page.click('#app ul li a');
  await page.waitForSelector('#app article h2', { timeout: 8000 });
  expect(/\/navigation\/app\/posts\/\d+/.test(page.url()), `url ${page.url()}`);
  expect((await page.title()).startsWith('Post'), `title ${await page.title()}`);
});

await flow('morph light: typed text survives a morph refresh', async (page) => {
  await page.goto(`${base}/morph/light.html`);
  await page.waitForSelector('#status-note', { timeout: 5000 });
  await page.fill('#status-note', 'keep me');
  await page.waitForTimeout(3500);
  expect((await page.inputValue('#status-note')) === 'keep me', 'typed text lost');
  expect((await page.textContent('#lost')) === '0', 'lost counter incremented');
});

await flow('sync heavy: add a note and it syncs', async (page) => {
  await page.goto(`${base}/sync/heavy.html`);
  await page.waitForTimeout(800);
  await page.fill('#text', 'smoke note');
  await page.press('#text', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('#list input')].some((i) => i.value === 'smoke note'), null, { timeout: 5000 });
  await page.waitForFunction(() => /0 changes in the outbox/.test(document.getElementById('status').textContent), null, { timeout: 8000 });
});

await flow('forms light: no-JS post returns server page', async (page) => {
  await page.goto(`${base}/forms/light.html`);
  await page.fill('#email', 'ada@company.test');
  await page.click('button[type=submit]');
  await page.waitForSelector('h1:has-text("Subscribed")', { timeout: 8000 });
});

await browser.close();
console.log(failed ? `\n${failed} flow(s) failed` : '\nall flows passed');
process.exit(failed ? 1 : 0);
