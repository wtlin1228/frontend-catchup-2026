// Opens pages in a headless Chrome and reports console errors, page errors, failed requests and structural
// problems (no #main, unexpanded partials, missing active-link markers).
//   node pages.mjs <baseUrl> [pathFilter]       as a script
//   import { checkPages } from './pages.mjs'     from compare.mjs
import { ALL_PAGES, isExpectedConsole, isHeadlessNoise, isMain, launch } from './lib.mjs';

/** Check `paths` on `base`; returns [{ path, title, issues }]. Pass `context` to reuse a browser. */
export async function checkPages(base, { paths = ALL_PAGES, filter = '', context: shared } = {}) {
  const own = shared ? null : await launch();
  const context = shared ?? own.context;
  const results = [];
  for (const path of paths.filter((p) => p.includes(filter))) {
    const page = await context.newPage();
    const issues = [];
    page.on('console', (msg) => { if (['error', 'warning'].includes(msg.type()) && !isExpectedConsole(msg.text())) issues.push(`console.${msg.type()}: ${msg.text().slice(0, 300)}`); });
    page.on('pageerror', (err) => { if (!isHeadlessNoise(String(err))) issues.push(`pageerror: ${String(err).slice(0, 300)}`); });
    page.on('requestfailed', (req) => { if (!req.url().includes('/stream')) issues.push(`requestfailed: ${req.method()} ${req.url()} ${req.failure()?.errorText}`); });
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
      }));
      if (!info.mainId) issues.push('no #main');
      if (info.includesLeft) issues.push('unexpanded @include');
      if (info.placeholdersLeft) issues.push('unexpanded {{placeholder}}');
      const special = path === '/' || path.includes('fallback') || path.includes('/app');
      if (!special && info.currentVariant !== 1) issues.push(`variant aria-current count ${info.currentVariant}`);
      if (path !== '/' && !path.includes('fallback') && info.currentPage !== 1) issues.push(`page aria-current count ${info.currentPage}`);
      if (!title) issues.push('empty <title>');
      if (!info.h1) issues.push('no <h1>');
    } catch (err) {
      issues.push(`EXCEPTION: ${String(err).slice(0, 200)}`);
    }
    results.push({ path, title, issues });
    await page.close();
  }
  await own?.browser.close();
  return results;
}

if (isMain(import.meta.url)) {
  const base = process.argv[2] ?? 'http://localhost:4173';
  const results = await checkPages(base, { filter: process.argv[3] ?? '' });
  for (const r of results) {
    console.log(`${r.issues.length ? 'FAIL' : 'OK  '} ${r.path}  [${r.title}]`);
    for (const i of r.issues) console.log(`      ${i}`);
  }
  const clean = results.filter((r) => !r.issues.length).length;
  console.log(`\n${clean}/${results.length} pages clean`);
  process.exit(clean === results.length ? 0 : 1);
}
