# Astro

| | |
|---|---|
| Kind | Content-first meta-framework: static HTML by default, islands of any UI framework (React, Vue, Svelte, Solid, Preact) or none. |
| Version checked (2026-10-05) | astro 7.3.5 (7.0 in mid-2026: Rust compiler, Vite 8, route caching stable, Advanced Routing via `src/fetch.ts`, structured logging, new whitespace handling) |
| Reactivity | None in `.astro` components (they render once); islands bring their own framework's reactivity; shared state via nanostores. |
| Rendering | Static by default; per-route SSR with an adapter; server islands; `client:*` directives decide when island JS loads. |
| Best at | Content and marketing sites, documentation, anything mostly static with pockets of interactivity. |

## Pattern map

| # | Pattern | How you build it in Astro |
|---|---|---|
| 1 | Static content | The default. Layout components with slots; `<head>` managed in the layout; zero JS unless you add it. |
| 2 | Forms | Astro Actions (`defineAction` with Zod) called from a plain `<form>` for the no-JS path and from a script for the enhanced path; `accept: 'form'` handles uploads. |
| 3 | Dynamic | `[id].astro` pages rendered on the server; client-side routing via `<ClientRouter>` (view transitions) or an island with its framework's router; data cache via route caching or your own `fetch` in frontmatter. |
| 4 | Client state | An island (React/Svelte/Solid board) or a vanilla `<script>` module exactly as in the baseline; nanostores to share between islands. |
| 5 | 3D | A `client:only` island or a `<script>` with a dynamic import; `client:visible` delays loading until on screen. |
| 6 | Real-time | A `<script>` or an island subscribing to SSE; SSE endpoints as `.ts` routes with streaming responses. |
| 7 | Media | `astro:assets` `<Image>` and `<Picture>` (build-time formats and sizes, remote images allowed-listed). |
| 8 | Cross-cutting | Middleware (`src/middleware.ts`) and `Astro.locals`; sessions API; `Astro.cookies` for theme; built-in i18n routing. |
| 9 | Content | Content Layer and collections with schemas, Markdown/MDX with components, `getCollection`, built-in RSS and sitemap integrations, Starlight for docs. |
| 10 | Data grid | An island with TanStack Table/Virtual, or the baseline's vanilla module as a `<script>`. |
| 11 | Composite widgets | Islands from any framework's headless library; or native elements and the baseline's vanilla widgets. |
| 12 | Motion | `<ClientRouter>` view transitions with `transition:name`; island-level animation libraries. |
| 13 | Offline | `@vite-pwa/astro`. |

## Migrating the baseline

1. `npm create astro@latest`; Astro runs on Vite, so `mockApi()` goes into `astro.config.mjs` under `vite.plugins`, or port endpoints to `src/pages/api/*.ts`.
2. Partials become layout components; every baseline page is an `.astro` page; the baseline's page modules can be pasted into `<script>` tags almost unchanged: Astro is the candidate closest to the baseline.
3. Then replace one heavy page at a time with an island in the UI library under consideration to measure the island's cost.

## From the 2025–26 blog

Astro 7: Rust compiler, Vite 8, stable route caching, Advanced Routing (`src/fetch.ts`), experimental CDN cache providers, background dev server, structured logging; State of JS 2025 ranked it first in meta-framework satisfaction. Record cold and warm build times and the CDN caching story.

## Watch out for

- Islands do not share a component tree or state; cross-island state needs nanostores or the URL.
- Heavy client pages (board, dashboard, grid) are "an island of some other framework"; Astro itself adds little there, which is the point.
- Astro 7 changed whitespace handling in templates and requires Vite 8; integrations lag majors by a few weeks.
- SSR needs an adapter; many features (sessions, actions, server islands) assume one.

## Links

- https://astro.build, https://docs.astro.build
