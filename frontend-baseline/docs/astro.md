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
| 14 | Async consistency | Astro's answer is to do the async on the server: `await Promise.all()` in frontmatter commits atomically by construction, `server:defer` islands with `slot="fallback"` fill in after first paint, `<ClientRouter>` keeps the old page visible until the next one is fetched (`astro:before-preparation` for a pending indicator). Light tabs: a `<script>` with AbortController and latest-wins as in the baseline; heavy: an island using its framework's primitives (React `useTransition`/`useOptimistic`, TanStack Query `keepPreviousData` and `useSuspenseQueries`) or the baseline's `async-heavy.js` module; per-source retry and request versioning hand-rolled. |
| 15 | State across navigation | `<ClientRouter>` restores scroll on back/forward and `transition:persist` keeps an island or element and its state across pages (`transition:persist-props` for props); the filter comes back from `Astro.url.searchParams` on the server or from the URL in a `<script>`. Heavy: three tabs inside one island use that framework's primitive (React `<Activity>`, Vue `<KeepAlive>`), vanilla tabs the baseline's hidden + `inert` + paused animation; nothing keeps state across islands, that is nanostores or the URL. |
| 16 | Server functions | Actions: `defineAction({ input: z.object(), handler })` in `src/actions/index.ts`, called as `actions.name(input)` returning `{ data, error }`; `ActionError` codes, `isInputError(error)` with `error.fields` for per-field validation errors, auth via `context.locals`/`context.session` in the handler. Each call is its own POST to `/_actions/<name>`: batching and in-flight deduplication are not built in, so keep the baseline's `src/lib/rpc.js` or wrap the action calls; a live subscription stays an SSE `.ts` endpoint (row 6). |
| 17 | Sync and local-first | Nothing built in. Light: the baseline's `src/lib/sync.js` in a `<script>` unchanged, with `src/pages/api/sync.ts` and `sync/stream.ts` endpoints standing in for the mock API; heavy: an island with TanStack DB, Replicache or Electric, kept alive across `<ClientRouter>` navigations with `transition:persist`; conflict and change-feed UI belong to the island. |
| 18 | Morphing and streaming HTML | Page partials (`export const partial = true`) render a fragment of server HTML without the document shell: fetch it and morph with idiomorph or the baseline's `src/lib/morph.js` (`<ClientRouter>` swaps whole documents; `swapFunctions` from `astro:transitions/client` customise that). Streaming: SSR output streams in order, `server:defer` islands fill in after the shell, and a `.ts` endpoint returning a chunked `ReadableStream` feeds the heavy page's progressive morph; `moveBefore` hand-written. |
| 19 | Platform navigation | The light page is Astro's home ground: static pages, `@view-transition { navigation: auto }` in a global stylesheet, `<link rel="expect">` and `<script type="speculationrules" is:inline>` in the layout head, no `<ClientRouter>` (it is a History-API fetch-and-swap router with `data-astro-prefetch` and the `prefetch` config, not the Navigation API). Heavy: a rest route `src/pages/navigation/app/[...path].astro` with `prerender = false` serves the shell for any URL under the prefix and the baseline's Navigation-API + URLPattern router goes in a `<script>` unchanged; `experimental.clientPrerender` wires prefetching to the Speculation Rules API, check its status in 7 (verify). |
| 20 | Error boundaries | Server: `src/pages/500.astro` receives the `error` prop, `404.astro` for not found, middleware can `try { await next() } catch` and rewrite; a `server:defer` island fails on its own request, not with the page. Client: islands use their framework's boundary (React error boundary, Solid `<ErrorBoundary>`, Vue `onErrorCaptured`); vanilla sections and the global `error`/`unhandledrejection` beacon live in a layout `<script>` as in the baseline, posting to `/api/errors` or a `src/pages/api/errors.ts` endpoint; backoff retry and fingerprinting hand-rolled. |
| 21 | Observability | Server: Astro 7 structured logging; `Server-Timing` set in middleware on the response from `next()` or in `.ts` endpoints; no OpenTelemetry integration, so wrap `next()` in a span with `@opentelemetry/api` and start the SDK alongside the Node adapter. Client: the dev toolbar's audit app in dev; `web-vitals` or the baseline's PerformanceObserver code in a `<script>`; the trace waterfall is the baseline page as is. |
| 22 | Security hardening | `security.checkOrigin` rejects cross-origin POSTs to server-rendered pages and actions (on by default); the double-submit cookie goes on top via `Astro.cookies` in middleware and a check in the action; Trusted Types: nothing in Astro, the sinks are in islands and `<script>`s (a named policy and DOMPurify as in the baseline), `set:html` is server-side so sanitise with `sanitize-html` or `rehype-sanitize` first; CSP: Astro's own `<script>` tags become external modules and `<style>` a stylesheet, so a strict policy mostly holds, `is:inline` scripts (the theme reader) need a hash, and `experimental.csp` computes hashes for Astro's inline output, check its status in 7 (verify). |
| 23 | Styling strategy | `<style>` in `.astro` components is scoped by default (attribute selector, `scopedStyleStrategy`), `is:global` and `:global()` opt out, `define:vars` passes frontmatter values as custom properties, `class:list` for conditional classes; tokens, `light-dark()` and layers in `src/styles/*.css` imported from the layout; islands keep their framework's styling (CSS Modules, Svelte/Vue scoped); Tailwind 4 via `@tailwindcss/vite`; the heavy page's `@scope`, container queries, `@property` and subgrid are plain CSS: put them in an imported stylesheet or `is:global` so Astro's scoping does not rewrite the selectors. |

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
