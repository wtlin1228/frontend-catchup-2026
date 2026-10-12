import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockApi } from '../../scripts/mock-api.js';

// The port shares the baseline's mock API, public assets (images, manifest, favicon) and stylesheet,
// so the only thing that differs between the two builds is the framework.
const root = fileURLToPath(new URL('.', import.meta.url));
const baseline = resolve(root, '../..');
const SKIP = new Set(['node_modules', 'dist', 'src']);

function htmlFiles(dir, depth = 0) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = resolve(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
    else if (entry.isDirectory() && depth < 1 && !SKIP.has(entry.name)) out.push(...htmlFiles(full, depth + 1));
  }
  return out;
}

export default defineConfig({
  appType: 'mpa',
  publicDir: resolve(baseline, 'public'),
  plugins: [react(), mockApi({ dataFile: resolve(baseline, 'public/data/posts.json') })],
  resolve: { alias: { '@baseline': baseline } },
  server: { fs: { allow: [baseline] } },
  build: { rolldownOptions: { input: htmlFiles(root) } },
});
