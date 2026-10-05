// Smoke test: open every page in a headless Chrome, collect console errors, page errors and failed requests.
// Usage: node smoke.mjs <baseUrl> [pathFilter]
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4173';
const filter = process.argv[3] ?? '';
const patterns = ['static', 'forms', 'dynamic', 'state', 'scene', 'realtime', 'media', 'account', 'content', 'table', 'components', 'motion', 'offline', 'async', 'keepalive', 'rpc', 'sync', 'morph', 'navigation', 'errors', 'observe', 'security', 'styling'];
const pages = ['/', ...patterns.flatMap((p) => [`/${p}/light.html`, `/${p}/heavy.html`]), '/offline/fallback.html', '/navigation/app', '/navigation/app/about',
  '/content/articles/measuring-a-framework.html'].filter((p) => p.includes(filter));

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--enable-features=NavigationAPI'] });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
let failures = 0;
for (const path of pages) {
  const page = await context.newPage();
  const issues = [];
  page.on('console', (msg) => { if (['error', 'warning'].includes(msg.type()) && !/GPU stall|api\/flaky/.test(msg.text())) issues.push(`console.${msg.type()}: ${msg.text().slice(0, 300)}`); });
  page.on('pageerror', (err) => issues.push(`pageerror: ${String(err).slice(0, 300)}`));
  page.on('requestfailed', (req) => { if (!req.url().includes('/api/stream') && !req.url().includes('/stream')) issues.push(`requestfailed: ${req.method()} ${req.url()} ${req.failure()?.errorText}`); });
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('/api/flaky')) issues.push(`http ${res.status()}: ${res.url()}`); });
  let title = '';
  try {
    const res = await page.goto(base + path, { waitUntil: 'load', timeout: 20000 });
    if (!res || res.status() >= 400) issues.push(`navigation status ${res?.status()}`);
    await page.waitForTimeout(1500);
    title = await page.title();
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60),
      currentPage: document.querySelectorAll('[data-page][aria-current="page"]').length,
      currentVariant: document.querySelectorAll('[data-variant][aria-current="page"]').length,
      mainId: !!document.getElementById('main'),
      includesLeft: document.documentElement.outerHTML.includes('@include'),
      placeholdersLeft: /\{\{[a-z-]+\}\}/.test(document.documentElement.outerHTML),
      lang: document.documentElement.lang,
    }));
    if (!info.mainId) issues.push('no #main');
    if (info.includesLeft) issues.push('unexpanded @include');
    if (info.placeholdersLeft) issues.push('unexpanded {{placeholder}}');
    if (path !== '/' && !path.includes('fallback') && !path.includes('/app') && info.currentVariant !== 1) issues.push(`variant aria-current count ${info.currentVariant}`);
    if (path !== '/' && !path.includes('fallback') && info.currentPage !== 1) issues.push(`page aria-current count ${info.currentPage}`);
    if (!title) issues.push('empty <title>');
    if (!info.h1) issues.push('no <h1>');
  } catch (err) {
    issues.push(`EXCEPTION: ${String(err).slice(0, 200)}`);
  }
  const ok = issues.length === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${path}  [${title}]`);
  for (const i of issues) console.log(`      ${i}`);
  await page.close();
}
await browser.close();
console.log(`\n${pages.length - failures}/${pages.length} pages clean`);
process.exit(failures ? 1 : 0);
