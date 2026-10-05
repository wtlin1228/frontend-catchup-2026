// Shipped bytes per page, from dist/: the HTML plus every stylesheet, module script and modulepreload it
// references, gzip-compressed as a server would send them. Chunks behind a dynamic import() are listed
// apart, because they load on demand (the three.js chunk on the scene heavy page, for example).
// This is the survey's first measurement; point it at another Vite-built dist to compare a port:
//   node scripts/page-weight.mjs            # this project's dist/
//   node scripts/page-weight.mjs ../port/dist
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('[page-weight] no dist directory: run `pnpm build` first');
  process.exit(1);
}

const sizes = new Map(); // site path -> { raw, gz }
function size(sitePath) {
  if (!sizes.has(sitePath)) {
    const file = resolve(dist, `.${sitePath}`);
    if (!existsSync(file)) return null;
    const buf = readFileSync(file);
    sizes.set(sitePath, { raw: buf.length, gz: gzipSync(buf, { level: 6 }).length });
  }
  return sizes.get(sitePath);
}
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}
const toSitePath = (ref, from) => (ref.startsWith('/') ? ref : posix.normalize(posix.join(posix.dirname(from), ref)));
const kb = (n) => (n / 1024).toFixed(1).padStart(6);

const rows = [];
for (const file of walk(dist)) {
  const page = '/' + relative(dist, file).split('\\').join('/');
  const html = readFileSync(file, 'utf8');
  const css = new Set();
  const js = new Set();
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) css.add(toSitePath(m[1], page));
  for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) js.add(toSitePath(m[1], page));
  for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)) js.add(toSitePath(m[1], page));
  // Lazy chunks: dynamic imports and workers referenced from the page's own chunks, one level deep.
  const lazy = new Set();
  for (const chunk of js) {
    const code = readFileSync(resolve(dist, `.${chunk}`), 'utf8');
    for (const m of code.matchAll(/import\(["'`]([^"'`]+)["'`]\)/g)) lazy.add(toSitePath(m[1], chunk));
    for (const m of code.matchAll(/new Worker\(\s*(?:new URL\()?["'`]([^"'`]+)["'`]/g)) lazy.add(toSitePath(m[1], chunk));
  }
  const sum = (set) => [...set].reduce((n, p) => n + (size(p)?.gz ?? 0), 0);
  const htmlGz = gzipSync(Buffer.from(html), { level: 6 }).length;
  rows.push({ page, html: htmlGz, css: sum(css), js: sum(js), lazy: [...lazy].map((p) => ({ path: p, gz: size(p)?.gz ?? 0 })) });
}
rows.sort((a, b) => a.page.localeCompare(b.page));

console.log(`Shipped per page in ${relative(process.cwd(), dist) || '.'} (gzip, kB): html + css + js = total; lazy chunks load on demand\n`);
console.log(`${'page'.padEnd(46)}${'html'.padStart(6)}${'css'.padStart(7)}${'js'.padStart(7)}${'total'.padStart(8)}  lazy`);
for (const r of rows) {
  const total = r.html + r.css + r.js;
  const lazy = r.lazy.map((l) => `${posix.basename(l.path)} ${(l.gz / 1024).toFixed(1)}`).join(', ');
  console.log(`${r.page.padEnd(46)}${kb(r.html)}${kb(r.css).padStart(7)}${kb(r.js).padStart(7)}${kb(total).padStart(8)}  ${lazy}`);
}
const shared = [...sizes.entries()].filter(([p]) => p.endsWith('.css') || p.endsWith('.js')).sort((a, b) => b[1].gz - a[1].gz).slice(0, 5);
console.log(`\nLargest assets: ${shared.map(([p, s]) => `${posix.basename(p)} ${(s.gz / 1024).toFixed(1)} kB`).join(', ')}`);
