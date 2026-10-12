// Collects the numbers the survey asks for from the pages that print them, in one headless-Chrome run.
//   node measure.mjs <baseUrl> [pageFilter] [--json]   as a script ("state" measures only the pages whose name contains it)
//   import { measure } from './measure.mjs'              from compare.mjs
// Headless numbers are indicative (no GPU, shared CPU): compare implementations measured the same way on the
// same machine, never against numbers from another machine.
import { cpus, platform, release } from 'node:os';
import { isMain, launch } from './lib.mjs';

export const MEASUREMENTS = [];
const measurement = (name, fn) => MEASUREMENTS.push({ name, fn });
let results = [];
const record = (page, measurement, value, unit = '') => results.push({ page, measurement, value, unit });
const num = (text, re) => Number((text.match(re) ?? [])[1]);
const median = (values) => { const s = [...values].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/** The page a measurement drives, as a site path: "state heavy" -> "/state/heavy.html". */
export const measurementPage = (name) => `/${name.replace('real-time', 'realtime').replace('data grid', 'table').replace('server functions', 'rpc').replace('observability', 'observe').replace(' ', '/')}.html`;

export const machine = () => `${platform()} ${release()}, ${cpus()[0]?.model?.trim() ?? 'unknown CPU'} x${cpus().length}, headless Chrome`;

/** Run the measurements on `base`; returns [{ page, measurement, value, unit }]. `has(path)` skips pages a port lacks. */
export async function measure(base, { only = '', has = () => true, context: shared } = {}) {
  const own = shared ? null : await launch();
  const context = shared ?? own.context;
  results = [];
  for (const { name, fn } of MEASUREMENTS) {
    if (only && !name.includes(only)) continue;
    if (!has(measurementPage(name))) continue;
    const page = await context.newPage();
    try { await fn(page, base); } catch (err) { record(name, 'error', String(err.message ?? err).slice(0, 120)); }
    await page.close();
  }
  await own?.browser.close();
  return results;
}

measurement('state heavy', async (page, base) => {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    await page.goto(`${base}/state/heavy.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('#stress');
    await page.waitForFunction(() => /306 cards/.test(document.getElementById('stat-count').textContent));
    const first = num(await page.textContent('#stat-render'), /([\d.]+) ms/);
    await page.click('#stress');
    await page.waitForFunction(() => /606 cards/.test(document.getElementById('stat-count').textContent));
    const second = num(await page.textContent('#stat-render'), /([\d.]+) ms/);
    await page.fill('#filter', 'card 5');
    await page.waitForTimeout(300);
    runs.push({ first, second, filter: num(await page.textContent('#stat-render'), /([\d.]+) ms/) });
  }
  record('state heavy', 'render after Add 300 cards (306 on the board)', median(runs.map((r) => r.first)), 'ms');
  record('state heavy', 'render after a second Add 300 (606 on the board)', median(runs.map((r) => r.second)), 'ms');
  record('state heavy', 'render after a filter keystroke (606 cards)', median(runs.map((r) => r.filter)), 'ms');
});

measurement('real-time heavy', async (page, base) => {
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

measurement('data grid heavy', async (page, base) => {
  await page.goto(`${base}/table/heavy.html`);
  for (const rows of ['50000', '200000']) {
    await page.selectOption('#rows', rows);
    for (const compute of ['worker', 'main']) {
      await page.check(`input[name="compute"][value="${compute}"]`);
      await page.waitForFunction((rows) => new RegExp(`of ${Number(rows).toLocaleString('en-US')} rows, sorted and filtered in`).test(document.getElementById('status').textContent), rows, { timeout: 60000 });
      const where = compute === 'worker' ? 'worker' : 'main thread';
      const times = [];
      for (let i = 0; i < 3; i++) {
        const before = await page.textContent('#status');
        await page.click('#head [role=columnheader] button:has-text("Score")');
        await page.waitForFunction(([prev, where]) => { const t = document.getElementById('status').textContent; return t !== prev && t.includes(`on the ${where}`); }, [before, where], { timeout: 60000 });
        times.push(num(await page.textContent('#status'), /in ([\d.]+) ms/));
      }
      record('data grid heavy', `${Number(rows).toLocaleString('en-US')} rows: sort by score on the ${where}`, median(times), 'ms');
    }
  }
});

measurement('server functions heavy', async (page, base) => {
  await page.goto(`${base}/rpc/heavy.html`);
  await page.click('#batch');
  await page.waitForFunction(() => /came back in/.test(document.getElementById('batch-out').textContent));
  record('server functions heavy', 'requests for five same-tick calls', num(await page.textContent('#batch-out'), /came back in (\d+) request/));
});

measurement('observability light', async (page, base) => {
  await page.goto(`${base}/observe/light.html`);
  await page.waitForTimeout(3000);
  const dl = await page.$$eval('#vitals dt, #vitals dd', (els) => els.map((e) => e.textContent.trim()));
  for (let i = 0; i < dl.length; i += 2) {
    const value = dl[i + 1];
    if (/waiting/.test(value)) continue;
    record('observability light', dl[i], num(value, /([\d.]+)/), /ms/.test(value) ? 'ms' : '');
  }
});

measurement('observability heavy', async (page, base) => {
  await page.goto(`${base}/observe/heavy.html`);
  await page.click('#run');
  await page.waitForFunction(() => /spans/.test(document.getElementById('summary').textContent), null, { timeout: 15000 });
  const summary = await page.textContent('#summary');
  record('observability heavy', 'trace: spans', num(summary, /(\d+) spans/));
  record('observability heavy', 'trace: total (two API calls with mock latency plus a render)', num(summary, /(\d+) ms total/), 'ms');
});

if (isMain(import.meta.url)) {
  const base = process.argv[2] ?? 'http://localhost:4173';
  const only = process.argv.find((a, i) => i >= 3 && !a.startsWith('--')) ?? '';
  const out = await measure(base, { only });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ base, machine: machine(), date: new Date().toISOString().slice(0, 10), results: out }, null, 2));
  } else {
    console.log(`Measured ${base} on ${machine()}\n`);
    for (const r of out) console.log(`${r.page.padEnd(24)} ${r.measurement.padEnd(64)} ${String(r.value).padStart(8)} ${r.unit}`);
  }
}
