// Checks the built site in dist/: every page has the structure the partials promise (lang, title, one h1,
// #main, no unexpanded includes or placeholders), every same-origin link, image, stylesheet, script and
// manifest icon points at a file that exists, every in-page anchor has a target, and the sitemap lists
// only pages that were built. No browser, no dependencies; `pnpm check` runs it after a build.
// It stands in for the link checkers and HTML validators that CI pipelines add around a framework build.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] ?? 'dist'); // an explicit directory lets the checker run on any build output
if (!existsSync(dist)) {
  console.error('[check-dist] dist/ is missing: run `pnpm build` first');
  process.exit(1);
}

// URL prefixes the mock API or the service worker answers at runtime, so no file is expected.
const RUNTIME = ['/api/', '/navigation/app'];
const SKIP = /^(https?:|mailto:|tel:|data:|blob:|javascript:|#$)/i;

const problems = [];
const problem = (file, text) => problems.push(`${relative(root, file)}: ${text}`);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Does a site path (like /static/light.html or /images/x.png) exist in dist? */
function resolves(sitePath) {
  if (RUNTIME.some((p) => sitePath.startsWith(p))) return true;
  let file = sitePath;
  if (file.endsWith('/')) file += 'index.html';
  const abs = resolve(dist, `.${file}`);
  if (!abs.startsWith(dist)) return false;
  return existsSync(abs) && statSync(abs).isFile();
}

/** Turn a reference found in a page into a site path, or null when it is not a local resource. */
function toSitePath(ref, pagePath) {
  const value = ref.trim();
  if (!value || SKIP.test(value)) return null;
  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null; // in-page anchor or query-only link
  return clean.startsWith('/') ? clean : posix.normalize(posix.join(posix.dirname(pagePath), clean));
}

const pages = [...walk(dist)].filter((f) => f.endsWith('.html'));
const builtPaths = new Set(pages.map((f) => '/' + relative(dist, f).split('\\').join('/')));

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const pagePath = '/' + relative(dist, file).split('\\').join('/');
  const isFragmentPage = pagePath === '/offline/fallback.html';

  // Structure.
  if (!/<html[^>]*\slang=/.test(html)) problem(file, 'no lang attribute on <html>');
  if (!/<title>[^<]+<\/title>/.test(html)) problem(file, 'empty or missing <title>');
  if (!/<meta name="description"/.test(html) && !isFragmentPage) problem(file, 'no meta description');
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problem(file, `${h1s} <h1> elements`);
  if (!/<main id="main"/.test(html)) problem(file, 'no <main id="main">');
  if (html.includes('<!-- @include') || html.includes('<!-- @variant')) problem(file, 'unexpanded partial directive');
  const placeholder = html.match(/\{\{[a-z-]+\}\}/);
  if (placeholder) problem(file, `unexpanded placeholder ${placeholder[0]}`);
  if (pagePath !== '/index.html' && !isFragmentPage && !html.includes('aria-current="page"')) problem(file, 'no aria-current="page" on the pattern menu or variant switcher');

  // References: href, src, action, poster, and the content of og:image.
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/\s(?:href|src|action|poster)="([^"]*)"/g)) {
    const ref = m[1];
    if (ref.startsWith('#')) {
      if (ref.length > 1 && !ids.has(ref.slice(1))) problem(file, `anchor ${ref} has no target id`);
      continue;
    }
    const sitePath = toSitePath(ref, pagePath);
    if (sitePath && !resolves(sitePath)) problem(file, `${ref} does not exist in dist`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      const sitePath = toSitePath(url, pagePath);
      if (sitePath && !resolves(sitePath)) problem(file, `srcset entry ${url} does not exist in dist`);
    }
  }
  for (const m of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) {
    const sitePath = toSitePath(m[1], pagePath);
    if (sitePath && !resolves(sitePath)) problem(file, `og:image ${m[1]} does not exist in dist`);
  }
}

// Manifest icons and start URL.
const manifestFile = resolve(dist, 'manifest.webmanifest');
if (existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  for (const icon of manifest.icons ?? []) if (!resolves(icon.src)) problem(manifestFile, `icon ${icon.src} does not exist in dist`);
  if (manifest.start_url && !resolves(manifest.start_url)) problem(manifestFile, `start_url ${manifest.start_url} does not exist in dist`);
} else problem(manifestFile, 'missing');

// Sitemap: every listed page must have been built, and every built pattern page must be listed.
const sitemapFile = resolve(dist, 'sitemap.xml');
if (existsSync(sitemapFile)) {
  const listed = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>[^<]*?(\/[^<]*)<\/loc>/g)].map((m) => m[1].replace(/^\/\/[^/]+/, ''));
  const listedSet = new Set(listed.map((p) => (p === '/' ? '/index.html' : p)));
  for (const p of listedSet) if (!builtPaths.has(p)) problem(sitemapFile, `lists ${p}, which was not built`);
  for (const p of builtPaths) if (!listedSet.has(p) && p !== '/offline/fallback.html') problem(sitemapFile, `does not list ${p}`);
} else problem(sitemapFile, 'missing');

// Service worker and feed exist.
for (const name of ['sw.js', 'feed.xml', 'favicon.svg', 'data/content-index.json', 'data/posts.json']) {
  if (!existsSync(resolve(dist, name))) problem(resolve(dist, name), 'missing');
}

if (problems.length) {
  console.error(`[check-dist] ${problems.length} problem${problems.length === 1 ? '' : 's'} in ${pages.length} pages:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`[check-dist] ${pages.length} pages: structure, links, assets, anchors, manifest and sitemap all check out`);
