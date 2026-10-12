// `pnpm compare`: build every implementation (the baseline and each impl/<name>), weigh its pages, open them,
// run the flows and the measurements against its preview server, and write docs/results.md and
// tools/smoke/results.json. Every implementation is treated the same way, so the columns are comparable.
//
//   node compare.mjs                   everything, no Lighthouse
//   node compare.mjs --lighthouse      adds Lighthouse (slow: about half a minute per page)
//   node compare.mjs --only vue        one implementation (plus the baseline for the table) without rebuilding the others
//   node compare.mjs --no-build        reuse the existing dist/ directories
//
// An implementation is any directory with a package.json and a compare.config.json:
//   { "name", "versionOf" (the package whose installed version labels the column), "preview" (port),
//     "pageFiles" (templates with {pattern}, {variant}, {Pattern}, {Variant} for the files that exist because of a page),
//     "shared" (files every page depends on) }
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { weigh } from '../../scripts/page-weight.mjs';
import { ALL_PAGES, PATTERNS, launch, waitFor } from './lib.mjs';
import { checkPages } from './pages.mjs';
import { runFlows, flowPage } from './flows.mjs';
import { measure, MEASUREMENTS, measurementPage, machine } from './measure.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args[args.indexOf('--only') + 1] && args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const withLighthouse = flag('--lighthouse');
const build = !flag('--no-build');

// ---------------------------------------------------------------- implementations
function loadImpl(dir, id) {
  const config = JSON.parse(readFileSync(resolve(dir, 'compare.config.json'), 'utf8'));
  let version = '';
  try { version = JSON.parse(readFileSync(resolve(dir, 'node_modules', config.versionOf, 'package.json'), 'utf8')).version; } catch { /* not installed */ }
  const label = !version ? config.name : config.name.toLowerCase() === config.versionOf ? `${config.name} ${version}` : `${config.name} (${config.versionOf} ${version})`;
  return { id, dir, ...config, version, label };
}
const impls = [loadImpl(root, 'baseline')];
const implDir = resolve(root, 'impl');
if (existsSync(implDir)) {
  for (const name of readdirSync(implDir).sort()) {
    const dir = resolve(implDir, name);
    if (existsSync(resolve(dir, 'compare.config.json'))) impls.push(loadImpl(dir, name));
  }
}
const selected = impls.filter((i) => !only || i.id === 'baseline' || i.id === only);

// ---------------------------------------------------------------- helpers
function run(cmd, cmdArgs, cwd) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, cmdArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => (code === 0 ? done(out) : fail(new Error(`${cmd} ${cmdArgs.join(' ')} failed in ${cwd}:\n${out.slice(-800)}`))));
  });
}
const vite = (dir) => resolve(dir, 'node_modules/.bin/vite');
const lines = (file) => (existsSync(file) ? (readFileSync(file, 'utf8').match(/\n/g) ?? []).length : 0); // like wc -l
const pascal = (s) => s[0].toUpperCase() + s.slice(1);
const pageKey = (path) => path.replace(/^\//, '').replace(/\.html$/, '');
const order = (path) => { const [p, v] = pageKey(path).split('/'); const i = PATTERNS.indexOf(p); return (i < 0 ? 99 : i) * 10 + (v === 'light' ? 0 : v === 'heavy' ? 1 : 2); };
const kb = (bytes) => (bytes / 1024).toFixed(1);

function pageLines(impl, path) {
  const [pattern, variant, ...rest] = pageKey(path).split('/');
  if (!variant || rest.length) return null; // the hub and generated article pages are not compared
  const files = impl.pageFiles.map((t) => t.replaceAll('{pattern}', pattern).replaceAll('{variant}', variant).replaceAll('{Pattern}', pascal(pattern)).replaceAll('{Variant}', pascal(variant)));
  const total = files.reduce((n, f) => n + lines(resolve(impl.dir, f)), 0);
  return total || null;
}

async function lighthouse(url, file) {
  await run('pnpm', ['dlx', 'lighthouse@13.5.0', url, '--only-categories=performance,accessibility,best-practices', '--chrome-flags=--headless=new --no-sandbox', '--output=json', `--output-path=${file}`, '--quiet'], root).catch(() => {});
  if (!existsSync(file)) return null;
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const score = (c) => Math.round(r.categories[c].score * 100);
  return { performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), lcp: r.audits['largest-contentful-paint'].displayValue, cls: r.audits['cumulative-layout-shift'].displayValue };
}

// ---------------------------------------------------------------- the run
const results = { date: new Date().toLocaleDateString('sv'), machine: machine(), node: process.version, lighthouse: withLighthouse, implementations: [] };
const { browser, context } = await launch();
results.chrome = browser.version();
const tmp = resolve(root, 'tools/smoke/.compare');
mkdirSync(tmp, { recursive: true });

for (const impl of selected) {
  const r = { id: impl.id, name: impl.name, label: impl.label, dir: relative(root, impl.dir) || '.', pages: {}, measurements: [], checks: {}, lighthouse: {} };
  process.stdout.write(`${impl.label}: `);
  if (build) { process.stdout.write('build '); await run('pnpm', ['build'], impl.dir); }
  const dist = resolve(impl.dir, 'dist');
  const { rows, assets } = weigh(dist);
  for (const row of rows) r.pages[row.page] = { html: row.html, css: row.css, js: row.js, lazy: row.lazy.reduce((n, l) => n + l.gz, 0), lines: pageLines(impl, row.page) };
  r.largestAsset = assets[0] ? { path: assets[0].path, gz: assets[0].gz } : null;
  r.sharedLines = impl.shared.reduce((n, f) => n + lines(resolve(impl.dir, f)), 0);
  const pkg = JSON.parse(readFileSync(resolve(impl.dir, 'package.json'), 'utf8'));
  r.dependencies = Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
  r.nodeModulesMb = Math.round(Number((await run('du', ['-sm', 'node_modules'], impl.dir)).split(/\s/)[0]));
  const has = (path) => Boolean(r.pages[path]);

  process.stdout.write('preview ');
  const server = spawn(vite(impl.dir), ['preview', '--port', String(impl.preview), '--strictPort'], { cwd: impl.dir, stdio: 'ignore' });
  const base = `http://localhost:${impl.preview}`;
  try {
    if (!(await waitFor(base + '/'))) throw new Error(`preview did not start on ${base}`);
    process.stdout.write('pages ');
    const pages = await checkPages(base, { paths: ALL_PAGES.filter(has), context });
    r.checks.pages = { clean: pages.filter((p) => !p.issues.length).length, total: pages.length, failed: pages.filter((p) => p.issues.length).map((p) => ({ path: p.path, issues: p.issues })) };
    process.stdout.write('flows ');
    const flows = await runFlows(base, { has, context });
    r.checks.flows = { passed: flows.filter((f) => f.ok).length, total: flows.length, failed: flows.filter((f) => !f.ok).map((f) => ({ name: f.name, error: f.error })) };
    process.stdout.write('measure ');
    r.measurements = await measure(base, { has, context });
    if (withLighthouse) {
      process.stdout.write('lighthouse ');
      for (const path of ['/static/light.html', '/dynamic/heavy.html', '/state/heavy.html'].filter(has)) {
        r.lighthouse[path] = await lighthouse(base + path, resolve(tmp, `${impl.id}-${pageKey(path).replace('/', '-')}.json`));
      }
    }
  } finally {
    server.kill();
  }
  results.implementations.push(r);
  console.log('done');
}
await browser.close();

// ---------------------------------------------------------------- output
if (only) { // keep the other implementations' previous results so the table stays complete
  try {
    const previous = JSON.parse(readFileSync(resolve(root, 'tools/smoke/results.json'), 'utf8'));
    for (const old of previous.implementations) if (!results.implementations.some((r) => r.id === old.id)) results.implementations.push(old);
    results.implementations.sort((a, b) => (a.id === 'baseline' ? -1 : b.id === 'baseline' ? 1 : a.id.localeCompare(b.id)));
  } catch { /* no previous run */ }
}
writeFileSync(resolve(root, 'tools/smoke/results.json'), JSON.stringify(results, null, 2) + '\n');

const cols = results.implementations;
const header = (first) => `| ${first} | ${cols.map((c) => c.label).join(' | ')} |\n|---|${cols.map(() => '---').join('|')}|\n`;
const cell = (fn) => cols.map((c) => { const v = fn(c); return v == null || v === '' ? '' : String(v); }).join(' | ');
const compared = [...new Set(cols.flatMap((c) => Object.keys(c.pages)))].filter((p) => cols.filter((c) => c.pages[p]).length >= 2).sort((a, b) => order(a) - order(b));
const baseline = cols.find((c) => c.id === 'baseline') ?? cols[0];
const measurementRows = [...new Set(cols.flatMap((c) => c.measurements.map((m) => `${m.page}|${m.measurement}`)))];
const findM = (c, key) => c.measurements.find((m) => `${m.page}|${m.measurement}` === key);

let md = `# Results

Generated by \`pnpm compare\` on ${results.date} (${results.machine}, Chrome ${results.chrome}, Node ${results.node}). Every implementation was built, opened, driven and measured the same way in one run, so the columns are comparable with each other; they are not comparable with numbers from another machine. Re-run the command to refresh this page; add \`--lighthouse\` for the Lighthouse table.

Implementations: ${cols.map((c) => `**${c.label}** (\`${c.dir}\`)`).join(', ')}.

## Shipped bytes per page

Gzip kilobytes of HTML, CSS and JavaScript the page references (fonts and images excluded); chunks loaded on demand are in brackets. Pages ported by at least two implementations.

${header('Page')}${compared.map((p) => `| ${pageKey(p)} | ${cell((c) => { const x = c.pages[p]; if (!x) return ''; const t = kb(x.html + x.css + x.js); return x.lazy ? `${t} (+${kb(x.lazy)} lazy)` : t; })} |`).join('\n')}
| JavaScript alone, static light | ${cell((c) => (c.pages['/static/light.html'] ? kb(c.pages['/static/light.html'].js) : ''))} |
| Largest asset | ${cell((c) => (c.largestAsset ? `${kb(c.largestAsset.gz)} (${c.largestAsset.path.split('/').pop().replace(/-[\w-]+\.(js|css)$/, '.$1')})` : ''))} |

## On-page measurements

What the pages print after the action named; collected by \`tools/smoke/measure.mjs\`. Board and grid timings are the median of three runs; the dashboard's are the median of five one-second samples. Headless Chrome adds noise of a few milliseconds, so read differences of that size as none.

${header('Measurement')}${measurementRows.map((key) => `| ${key.replace('|', ': ')} | ${cell((c) => { const m = findM(c, key); return m ? `${m.value}${m.unit ? ' ' + m.unit : ''}` : ''; })} |`).join('\n')}

## Lines per page

Only the files that exist because of the page (its HTML, script, component and stylesheet); the shared row is the layout, mount code and library every page depends on.

${header('Page')}${compared.map((p) => `| ${pageKey(p)} | ${cell((c) => c.pages[p]?.lines)} |`).join('\n')}
| Shared by every page | ${cell((c) => c.sharedLines)} |

## Checks and footprint

\`tools/smoke/pages.mjs\` opens every page the implementation builds; \`tools/smoke/flows.mjs\` runs every flow whose pages it has; dependencies are counted from \`package.json\` and \`node_modules\` measured with \`du\`.

${header('Check')}| Pages opened without errors | ${cell((c) => `${c.checks.pages.clean}/${c.checks.pages.total}`)} |
| Flows passed | ${cell((c) => `${c.checks.flows.passed}/${c.checks.flows.total}`)} |
| Direct dependencies (package.json) | ${cell((c) => c.dependencies)} |
| node_modules (MB) | ${cell((c) => c.nodeModulesMb)} |
${cols.some((c) => c.checks.pages.failed.length || c.checks.flows.failed.length) ? '\nFailures:\n' + cols.flatMap((c) => [...c.checks.pages.failed.map((f) => `- ${c.label}, ${f.path}: ${f.issues.join('; ')}`), ...c.checks.flows.failed.map((f) => `- ${c.label}, ${f.name}: ${f.error}`)]).join('\n') + '\n' : ''}`;

if (cols.some((c) => Object.keys(c.lighthouse).length)) {
  const pages = [...new Set(cols.flatMap((c) => Object.keys(c.lighthouse)))];
  md += `
## Lighthouse

One run per page, mobile preset. Performance, accessibility and best practices scores, then LCP and CLS.

${header('Page')}${pages.map((p) => `| ${pageKey(p)} | ${cell((c) => { const l = c.lighthouse[p]; return l ? `${l.performance} / ${l.accessibility} / ${l.bestPractices}; LCP ${l.lcp}, CLS ${l.cls}` : ''; })} |`).join('\n')}
`;
}

md += `
## All pages of the baseline

Gzip kilobytes: total (JavaScript alone). The reference for a port that adds a page.

| Page | Total | JS |
|---|---|---|
${Object.entries(baseline.pages).sort(([a], [b]) => order(a) - order(b)).map(([p, x]) => `| ${pageKey(p)} | ${kb(x.html + x.css + x.js)}${x.lazy ? ` (+${kb(x.lazy)} lazy)` : ''} | ${kb(x.js)} |`).join('\n')}
`;
writeFileSync(resolve(root, 'docs/results.md'), md);
console.log(`\nWrote docs/results.md and tools/smoke/results.json`);
