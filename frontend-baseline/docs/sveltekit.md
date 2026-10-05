# SvelteKit

| | |
|---|---|
| Kind | Svelte meta-framework: file routing, `load` functions, form actions, remote functions, adapters. |
| Version checked (2026-10-05) | @sveltejs/kit 3.0.0 (released after a September release candidate; requires Svelte 5, Node 22, TypeScript 6) |
| Reactivity | Svelte 5 runes (see svelte.md). |
| Rendering | SSR by default, prerendering per route, SPA mode, hybrid; streaming promises from `load`. |
| Best at | Progressive enhancement with little code; small client bundles. |

## Pattern map

| # | Pattern | How you build it in SvelteKit |
|---|---|---|
| 1 | Static content | `+layout.svelte`, `+page.svelte`, `export const prerender = true`; `<svelte:head>`. |
| 2 | Forms | Form actions in `+page.server.ts` work without JS; `use:enhance` adds pending and client-side handling; remote `form` functions with `submitted` state; uploads via `request.formData()`. |
| 3 | Dynamic | `load` in `+page.server.ts` (server) or `+page.ts` (universal); `data` prop; `invalidate`/`invalidateAll`; `data-sveltekit-preload-data`; remote `query` and `command` functions with optimistic updates; `+error.svelte` renders on both load and render failures in Kit 3. |
| 4 | Client state | `.svelte.js` modules with `$state`; `$app/state` for page state; shallow routing (`goto` with `state` in Kit 3). |
| 5 | 3D | `browser` check or `onMount`; Threlte; dynamic import inside `onMount`. |
| 6 | Real-time | `+server.ts` streaming SSE with `ReadableStream`; `$effect` subscription in the component. |
| 7 | Media | `@sveltejs/enhanced-img` for build-time images; native dialog. |
| 8 | Cross-cutting | `hooks.server.ts` `handle` for sessions and theme cookies; `event.locals`; redirects in `load`; Paraglide for i18n. |
| 9 | Content | mdsvex; `import.meta.glob` collections; `+server.ts` for feeds and sitemaps. |
| 10 | Data grid | TanStack Table/Virtual (Svelte adapters). |
| 11 | Composite widgets | Bits UI, Melt UI, shadcn-svelte. |
| 12 | Motion | Svelte transitions and `animate:flip`; `onNavigate` + `document.startViewTransition` for page transitions. |
| 13 | Offline | Built-in service worker support (`$app/service-worker` in Kit 3 exposes build files and prerendered routes). |
| 14 | Async consistency | Light: Kit's router keeps the old page on screen until the new `load` resolves and discards a superseded navigation, so a tab switch that is a navigation never flashes; dim with `navigating` from `$app/state`; `invalidate()` keeps `data` until the fresh value lands. Heavy: top-level awaits in `load` commit together (atomic), nested promises stream (`{#await data.related}`), and inside components Async Svelte with `<svelte:boundary>` (see svelte.md); remote `query` functions give per-source `refresh()` and `command.updates(query.withOverride(…))` for the optimistic lane. |
| 15 | State across navigation | `export const snapshot = { capture, restore }` in `+page.svelte` keeps form text and pane scroll across back and forward; scroll restoration is built in; the filter lives in the URL (`goto` with `replaceState`, `keepFocus`, `noScroll`) or in `page.state` via shallow routing (`pushState`/`replaceState`). No keep-alive for routes: the heavy tabs are one page with `hidden` and `inert` bound to the active tab, `{#key}` for destroy mode. |
| 16 | Server functions | Remote functions in `*.remote.ts`: `query` (deduplicated per argument, `refresh()`), `query.batch` for same-tick batching into one request, `command` for the guarded mutation (`getRequestEvent()` reads the session cookie, `error(401)`), a Standard Schema validator as first argument for per-call validation errors, `form` for progressive forms, `query.live` for the subscription; Kit serves them under one route prefix. Light: one `query` call is the whole page. Compare the network tab with the same calls as `+server.ts` routes. |
| 17 | Sync and local-first | Nothing built in; `query.live` is server-to-client only. Keep `src/lib/sync.js` as a `.svelte.js` class with `$state` fields, versions and the change feed from `+server.ts` routes (`ReadableStream` for SSE), outbox replay on `online`; TanStack DB's Svelte adapter, Replicache or Yjs bound to `$state` for the heavy page (verify). |
| 18 | Morphing and streaming HTML | Light: a `+server.ts` route returns `render(Fragment).body` from `svelte/server`; morph it into a `bind:this` node with `src/lib/morph.js` or idiomorph (`{@html}` replaces the subtree and loses focus). Heavy: `+server.ts` returns a `ReadableStream` of chunks, morphed per chunk by hand; Kit's own streaming sends promises from `load`, not HTML; `moveBefore` is a direct DOM call. |
| 19 | Platform navigation | Light: a route with `prerender = true` and `csr = false` ships no JS; `rel="expect"` and speculation rules in `<svelte:head>`, `@view-transition` in `app.css`. Heavy: Kit's router is History API based (`beforeNavigate` with `cancel()`, `afterNavigate`, `onNavigate` + `document.startViewTransition`, scroll and focus handled, `data-sveltekit-preload-data`); the shell for `/navigation/app/*` is a `[...rest]` route with `ssr = false`; a Navigation API + URLPattern router stays the baseline's code, so the comparison is Kit's router against it. |
| 20 | Error boundaries | `+error.svelte` per route segment is the route-level boundary (Kit 3 renders it for `load` and render failures alike); `handleError` in `hooks.client.ts` and `hooks.server.ts` is where fingerprinting and the beacon go; section-level boundaries inside a page are `<svelte:boundary>` with a `failed` snippet and `reset` (see svelte.md), backoff by scheduling `reset()`. Light: `handleError` plus `window.onerror`, since boundaries do not catch event-handler errors. |
| 21 | Observability | `setHeaders({ 'Server-Timing': … })` in `load` or on a `+server.ts` response feeds the browser's resource timing; Kit's OpenTelemetry integration emits spans for `handle`, `load`, form actions and remote functions once enabled, with `instrumentation.server.ts` wiring the exporter, which is the server half of the heavy trace (verify); client spans by hand or with `@opentelemetry/sdk-trace-web`; light: `web-vitals` or the baseline's observers unchanged. |
| 22 | Security hardening | `kit.csp` (`mode` hash, nonce or auto, plus `directives`) hashes or nonces Kit's inline bootstrap, which is what the theme script needs too; CSRF origin checking of form POSTs is on by default (`csrf.checkOrigin`), the double-submit token as in the baseline on top if wanted; `{@html}` is unescaped, so sanitise through a Trusted Types policy; Svelte 5's `fragments: 'tree'` compiler option for Trusted Types enforcement (see svelte.md, verify). |
| 23 | Styling strategy | Component `<style>` is scoped by default (see svelte.md); global tokens, `light-dark()` and layers in `app.css` imported from `+layout.svelte`; Vite's `.module.css` and `sv add tailwindcss` for the alternatives; `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through untouched. |

## Migrating the baseline

1. `npx sv create app`; Kit 3 takes its config through the Vite plugin, so add `mockApi()` beside it or port endpoints to `+server.ts` files.
2. Partials become `+layout.svelte`; pages become route directories (`src/routes/<pattern>/light/+page.svelte`).
3. `api.js` → `load`/remote functions; `router.js` → gone; `store.js` → `$state` modules; `theme.js` → a cookie in `hooks.server.ts`.

## Watch out for

- Kit 3 is days old: `$lib` became `#lib` (Node subpath imports), service-worker and env modules moved, adapters now bundle with Rolldown; migrate existing apps with `npx sv migrate sveltekit-3`.
- Server vs universal `load`: the wrong one leaks secrets or breaks prerendering.
- Remote functions are the newest data API; decide whether the port uses them or classic `load` + actions, and record it.

## Links

- https://svelte.dev/docs/kit
