import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlPartials } from './scripts/html-partials.js';
import { mockApi } from './scripts/mock-api.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const SKIP = new Set(['node_modules', 'dist', 'public', 'src', 'scripts', 'docs', 'content-src']);

// Multi-page app: index.html plus every <pattern>/*.html (and <pattern>/*/*.html for generated content pages).
// This is "file-based routing" done by hand; meta-frameworks derive the same thing from a pages/ directory.
function htmlFiles(dir, depth = 0) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = resolve(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
    else if (entry.isDirectory() && depth < 2 && !(depth === 0 && SKIP.has(entry.name))) out.push(...htmlFiles(full, depth + 1));
  }
  return out;
}

export default defineConfig({
  // No SPA fallback: unknown URLs 404 like on a static host. The dynamic pages do their own client-side routing.
  appType: 'mpa',
  plugins: [htmlPartials(), mockApi()],
  build: {
    rolldownOptions: { input: htmlFiles(root) },
  },
});
