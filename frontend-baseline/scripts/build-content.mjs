// Content pipeline: Markdown files in content-src/ become pages in content/, plus an index page,
// a search index, an RSS feed and a sitemap. Runs before dev and build.
// It stands in for content collections, MDX pipelines and the static-site generators built on them.
import { marked } from 'marked';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://frontend-baseline.example';
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const write = (p, s) => {
  mkdirSync(dirname(resolve(root, p)), { recursive: true });
  writeFileSync(resolve(root, p), s);
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parse(file) {
  const raw = read(file);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = { tags: [] };
  if (match) {
    for (const line of match[1].split('\n')) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const value = line.slice(i + 1).trim();
      meta[line.slice(0, i).trim()] = value.startsWith('[') ? value.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean) : value;
    }
  }
  const body = match ? raw.slice(match[0].length) : raw;
  const headings = [];
  const html = marked.parse(body).replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, '');
    const id = slug(text);
    headings.push({ level: Number(level), text, id });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { meta, html, headings, words: body.split(/\s+/).length, slug: basename(file, '.md') };
}

const layout = ({ title, description, body, head = '', script = '' }) => `<!doctype html>
<html lang="en">
<head>
  <!-- @include head.html -->
  <title>${escape(title)} · Frontend Baseline</title>
  <meta name="description" content="${escape(description)}">
  <link rel="stylesheet" href="/src/pages/content.css">
${head}</head>
<body>
  <!-- @include header.html -->
  <main id="main" class="container page">
${body}
  </main>
  <!-- @include footer.html -->
${script}</body>
</html>
`;
const patternHeader = `      <p class="pattern">Pattern 9 of 23: content pipeline</p>
      <!-- @include variant-nav.html -->`;

// --- light: one file, one page
const light = parse('content-src/light.md');
write('content/light.html', layout({
  title: `${light.meta.title} (content, light)`,
  description: light.meta.description,
  body: `    <div class="page-header">
${patternHeader}
      <h1>${escape(light.meta.title)}</h1>
      <p>${escape(light.meta.description)}</p>
    </div>
    <article class="prose">
${light.html}    </article>`,
}));

// --- heavy: a collection
const articles = readdirSync(resolve(root, 'content-src/articles'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => parse(`content-src/articles/${f}`))
  .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
const minutes = (a) => Math.max(1, Math.round(a.words / 200));
const tagLinks = (a) => a.meta.tags.map((t) => `<a class="tag" href="/content/heavy.html?tag=${t}">${t}</a>`).join(' ');

articles.forEach((a, i) => {
  const newer = articles[i - 1];
  const older = articles[i + 1];
  write(`content/articles/${a.slug}.html`, layout({
    title: a.meta.title,
    description: a.meta.description,
    head: `  <meta property="og:type" content="article">\n  <meta property="article:published_time" content="${a.meta.date}">\n`,
    body: `    <div class="page-header">
${patternHeader}
      <p><a href="/content/heavy.html">All articles</a></p>
      <h1>${escape(a.meta.title)}</h1>
      <p class="muted"><time datetime="${a.meta.date}">${a.meta.date}</time>, ${minutes(a)} min read. ${tagLinks(a)}</p>
    </div>
    <div class="article">
      <nav class="toc" aria-label="Contents"><ol>${a.headings.filter((h) => h.level === 2).map((h) => `<li><a href="#${h.id}">${escape(h.text)}</a></li>`).join('')}</ol></nav>
      <article class="prose">
${a.html}      </article>
    </div>
    <nav class="prev-next" aria-label="More articles">
      ${older ? `<a href="/content/articles/${older.slug}.html">Older: ${escape(older.meta.title)}</a>` : '<span></span>'}
      ${newer ? `<a href="/content/articles/${newer.slug}.html">Newer: ${escape(newer.meta.title)}</a>` : '<span></span>'}
    </nav>`,
  }));
});

const tags = [...new Set(articles.flatMap((a) => a.meta.tags))].sort();
write('content/heavy.html', layout({
  title: 'Articles (content, heavy)',
  description: 'A collection of Markdown articles with front matter: generated index, tags, tables of contents, search, RSS and a sitemap.',
  body: `    <div class="page-header">
${patternHeader}
      <h1>Articles</h1>
      <p>Five Markdown files with front matter became five pages, this index, a JSON search index, an RSS feed and a sitemap, all at build time. Search and tag filtering are the only script on this page.</p>
    </div>
    <div class="cluster" style="margin-bottom: var(--space-3)">
      <label for="search" class="visually-hidden">Search articles</label>
      <input id="search" class="input" type="search" placeholder="Search titles, descriptions and headings" style="max-width: 24rem" autocomplete="off">
      <span id="result-count" class="muted"></span>
    </div>
    <p class="cluster" id="tags"><a class="tag" href="/content/heavy.html" data-tag="">all</a>${tags.map((t) => `<a class="tag" href="?tag=${t}" data-tag="${t}">${t}</a>`).join('')}</p>
    <ul class="articles" id="articles">
${articles.map((a) => `      <li data-slug="${a.slug}" data-tags="${a.meta.tags.join(' ')}">
        <a href="/content/articles/${a.slug}.html">${escape(a.meta.title)}</a>
        <p>${escape(a.meta.description)}</p>
        <p class="muted"><time datetime="${a.meta.date}">${a.meta.date}</time>, ${minutes(a)} min read. ${tagLinks(a)}</p>
      </li>`).join('\n')}
    </ul>
    <p class="muted">Also generated: <a href="/feed.xml">RSS feed</a>, <a href="/sitemap.xml">sitemap</a>, <a href="/data/content-index.json">search index</a>.</p>`,
  script: `  <script type="module" src="/src/pages/content-heavy.js"></script>\n`,
}));

write('public/data/content-index.json', JSON.stringify(articles.map((a) => ({
  slug: a.slug, title: a.meta.title, description: a.meta.description, tags: a.meta.tags, headings: a.headings.map((h) => h.text),
}))) + '\n');

write('public/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Frontend Baseline articles</title><link>${SITE}/content/heavy.html</link><description>Articles from the content pipeline pattern.</description>
${articles.map((a) => `<item><title>${escape(a.meta.title)}</title><link>${SITE}/content/articles/${a.slug}.html</link><guid>${SITE}/content/articles/${a.slug}.html</guid><pubDate>${new Date(a.meta.date).toUTCString()}</pubDate><description>${escape(a.meta.description)}</description></item>`).join('\n')}
</channel></rss>
`);

const patterns = ['static', 'forms', 'dynamic', 'state', 'scene', 'realtime', 'media', 'account', 'content', 'table', 'components', 'motion', 'offline', 'async', 'keepalive', 'rpc', 'sync', 'morph', 'navigation', 'errors', 'observe', 'security', 'styling'];
const pages = ['/', ...patterns.flatMap((p) => [`/${p}/light.html`, `/${p}/heavy.html`]), ...articles.map((a) => `/content/articles/${a.slug}.html`)];
write('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}
</urlset>
`);
console.log(`[build-content] wrote ${articles.length + 2} pages, content-index.json, feed.xml, sitemap.xml`);
