// Collects the numbers the survey asks for from the pages that print them, in one headless-Chrome run.
// Usage: node measure.mjs <baseUrl> [--json]
// Headless numbers are indicative (no GPU, shared CPU); compare a port against the baseline measured the
// same way on the same machine, never against the numbers in docs/verify.md from another machine.
import { chromium } from 'playwright-core';
import { cpus, platform, release } from 'node:os';

const base = process.argv[2] ?? 'http://localhost:4173';
const asJson = process.argv.includes('--json');
const only = process.argv.find((a, i) => i >= 3 && !a.startsWith('--')) ?? ''; // measure only the pages whose name contains this
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const results = [];
const record = (page, measurement, value, unit = '') => results.push({ page, measurement, value, unit });
const num = (text, re) => Number((text.match(re) ?? [])[1]);

async function measure(name, fn) {
  if (only && !name.includes(only)) return;
  const page = await context.newPage();
  try { await fn(page); } catch (err) { record(name, 'error', String(err.message ?? err).slice(0, 120)); }
  await page.close();
}

await measure('state heavy', async (page) => {
  await page.goto(`${base}/state/heavy.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#stress');
  await page.waitForFunction(() => /306 cards/.test(document.getElementById('stat-count').textContent));
  record('state heavy', 'render after Add 300 cards (306 on the board)', num(await page.textContent('#stat-render'), /([\d.]+) ms/), 'ms');
  await page.click('#stress');
  await page.waitForFunction(() => /606 cards/.test(document.getElementById('stat-count').textContent));
  record('state heavy', 'render after a second Add 300 (606 on the board)', num(await page.textContent('#stat-render'), /([\d.]+) ms/), 'ms');
  await page.fill('#filter', 'card 5');
  await page.waitForTimeout(300);
  record('state heavy', 'render after a filter keystroke (606 cards)', num(await page.textContent('#stat-render'), /([\d.]+) ms/), 'ms');
});

await measure('real-time heavy', async (page) => {
  await page.goto(`${base}/realtime/heavy.html`);
  await page.selectOption('#rate', '30');
  for (const strategy of ['patch', 'rebuild']) {
    await page.check(`input[name="strategy"][value="${strategy}"]`);
    await page.waitForTimeout(10000);
    const samples = [];
    for (let i = 0; i < 5; i++) { samples.push({ rps: Number(await page.textContent('#updates')), ms: Number(await page.textContent('#render-ms')) }); await page.waitForTimeout(1000); }
    record('real-time heavy', `${strategy}: renders per second at 30 Hz (median of 5)`, median(samples.map((s) => s.rps)));
    record('real-time heavy', `${strategy}: last render at 30 Hz (median of 5)`, median(samples.map((s) => s.ms)), 'ms');
  }
});

await measure('data grid heavy', async (page) => {
  await page.goto(`${base}/table/heavy.html`);
  for (const rows of ['50000', '200000']) {
    await page.selectOption('#rows', rows);
    for (const compute of ['worker', 'main']) {
      await page.check(`input[name="compute"][value="${compute}"]`);
      await page.waitForFunction((rows) => new RegExp(`of ${Number(rows).toLocaleString('en-US')} rows, sorted and filtered in`).test(document.getElementById('status').textContent), rows, { timeout: 60000 });
      await page.click('#head [role=columnheader] button:has-text("Score")');
      await page.waitForFunction((compute) => new RegExp(`on the ${compute === 'worker' ? 'worker' : 'main thread'}`).test(document.getElementById('status').textContent), compute, { timeout: 60000 });
      await page.waitForTimeout(500);
      record('data grid heavy', `${Number(rows).toLocaleString('en-US')} rows: sort by score on the ${compute === 'worker' ? 'worker' : 'main thread'}`, num(await page.textContent('#status'), /in ([\d.]+) ms/), 'ms');
    }
  }
});

await measure('server functions heavy', async (page) => {
  await page.goto(`${base}/rpc/heavy.html`);
  await page.click('#batch');
  await page.waitForFunction(() => /came back in/.test(document.getElementById('batch-out').textContent));
  record('server functions heavy', 'requests for five same-tick calls', num(await page.textContent('#batch-out'), /came back in (\d+) request/));
});

await measure('observability light', async (page) => {
  await page.goto(`${base}/observe/light.html`);
  await page.waitForTimeout(3000);
  const dl = await page.$$eval('#vitals dt, #vitals dd', (els) => els.map((e) => e.textContent.trim()));
  for (let i = 0; i < dl.length; i += 2) {
    const value = dl[i + 1];
    if (/waiting/.test(value)) continue;
    record('observability light', dl[i], num(value, /([\d.]+)/), /ms/.test(value) ? 'ms' : '');
  }
});

await measure('observability heavy', async (page) => {
  await page.goto(`${base}/observe/heavy.html`);
  await page.click('#run');
  await page.waitForFunction(() => /spans/.test(document.getElementById('summary').textContent), null, { timeout: 15000 });
  const summary = await page.textContent('#summary');
  record('observability heavy', 'trace: spans', num(summary, /(\d+) spans/));
  record('observability heavy', 'trace: total (two API calls with mock latency plus a render)', num(summary, /(\d+) ms total/), 'ms');
});

await browser.close();

function median(values) { const s = [...values].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; }

const machine = `${platform()} ${release()}, ${cpus()[0]?.model?.trim() ?? 'unknown CPU'} x${cpus().length}, headless Chrome`;
if (asJson) {
  console.log(JSON.stringify({ base, machine, date: new Date().toISOString().slice(0, 10), results }, null, 2));
} else {
  console.log(`Measured ${base} on ${machine}\n`);
  for (const r of results) console.log(`${r.page.padEnd(24)} ${r.measurement.padEnd(64)} ${String(r.value).padStart(8)} ${r.unit}`);
}
