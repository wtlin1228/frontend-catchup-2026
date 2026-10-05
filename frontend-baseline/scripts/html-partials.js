// Build-time HTML partials: `<!-- @include header.html -->` is replaced with src/partials/header.html.
// This is the smallest possible "layout" system. Every framework replaces it with components/layouts.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, relative, resolve, sep } from 'node:path';

const INCLUDE = /<!--\s*@include\s+([\w./-]+)\s*-->/g;
// `<!-- @variant heavy -->` marks a page that is not named light.html or heavy.html (generated articles) as one of the two.
const VARIANT = /<!--\s*@variant\s+(\w+)\s*-->\n?/;

export function htmlPartials({ dir = 'src/partials' } = {}) {
  let root;
  return {
    name: 'html-partials',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // '/abs/static/light.html' -> pattern 'static', variant 'light'; the root index is pattern 'index'.
        const parts = relative(root, ctx.filename).split(sep);
        const pattern = parts.length > 1 ? parts[0] : 'index';
        const variant = html.match(VARIANT)?.[1] ?? basename(ctx.filename, '.html');
        const expand = (src, depth = 0) =>
          src.replace(INCLUDE, (_, name) => {
            if (depth > 5) throw new Error(`[html-partials] include loop in ${name}`);
            return expand(readFileSync(resolve(root, dir, name), 'utf8'), depth + 1);
          });
        // Mark the current pattern and variant links. Frameworks do this with an "active link" helper.
        let out = expand(html.replace(VARIANT, ''))
          .replaceAll('{{pattern}}', pattern)
          .replace(`data-page="${pattern}"`, `$& aria-current="page"`)
          .replace(`data-variant="${variant}"`, `$& aria-current="page"`);
        // Content-Security-Policy hashes for the inline scripts of pages that opt in (security pattern).
        if (out.includes('{{csp-hashes}}')) {
          const hashes = [...out.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
            .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
          out = out.replace('{{csp-hashes}}', hashes.join(' '));
        }
        return out;
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes(`/${dir}/`)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
