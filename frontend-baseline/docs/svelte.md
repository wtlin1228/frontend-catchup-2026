# Svelte

| | |
|---|---|
| Kind | Compiler plus runtime; components compile to direct DOM updates. Meta-framework: SvelteKit. |
| Version checked (2026-10-12) | svelte 5.57.2 |
| Reactivity | Runes: `$state` (deep proxies), `$derived`, `$effect`, `$props`, `$bindable`; signals under the hood, no virtual DOM. |
| Rendering | Client with Vite; SSR, SSG and hybrid via SvelteKit. |
| Best at | Small output, readable components, motion and transitions built in. |

## Pattern map

| # | Pattern | How you build it in Svelte |
|---|---|---|
| 1 | Static content | Layout components with snippets; static HTML needs SvelteKit prerendering. |
| 2 | Forms | `bind:value` on native inputs; SvelteKit form actions + `use:enhance` for progressive enhancement; Superforms + Zod/Valibot; remote `form` functions in recent SvelteKit. |
| 3 | Dynamic | SvelteKit `load` and routing; in plain Svelte: svelte-routing or a hand router; TanStack Query (Svelte adapter) for cache and prefetch. |
| 4 | Client state | `$state` in a `.svelte.js` module as a shared store; undo via a history array of snapshots (`$state.snapshot`); keyed `{#each items as item (item.id)}`. |
| 5 | 3D | `$effect` with cleanup return, or Threlte (declarative three.js); dynamic `import()` for the chunk. |
| 6 | Real-time | `$effect` opens the EventSource and returns `close`; `$state.raw` for the ring buffers so pushes are cheap; updates are already fine-grained. |
| 7 | Media | `<enhanced:img>` in SvelteKit for build-time images; `bind:this` for the dialog; IntersectionObserver in `$effect`. |
| 8 | Cross-cutting | Context (`setContext`/`getContext`) or module-level `$state`; SvelteKit `hooks.server` for sessions; Paraglide or svelte-i18n. |
| 9 | Content | mdsvex (Markdown + Svelte); collections are a `import.meta.glob` plus front matter in SvelteKit. |
| 10 | Data grid | TanStack Table (Svelte adapter) + TanStack Virtual or svelte-virtual-list; workers via Vite. |
| 11 | Composite widgets | Bits UI / Melt UI (headless), shadcn-svelte, Skeleton. |
| 12 | Motion | Built in: `transition:fade`, `animate:flip`, `crossfade`, springs and tweens in `svelte/motion`; `document.startViewTransition` in SvelteKit `onNavigate`. |
| 13 | Offline | SvelteKit service worker support (`src/service-worker.js`, `$app/service-worker` in Kit 3) or `@vite-pwa/sveltekit`. |
| 14 | Async consistency | Async Svelte: `await` in `$derived` or in markup inside a `<svelte:boundary>` with a `pending` snippet; after the first render the old content stays while new promises resolve, `$effect.pending()` drives the dimming and stale results never commit; the older `{#await}` block flashes its pending branch instead. Heavy: three async deriveds in one boundary commit together (the dependent one simply reads the first); per-source retry via the boundary's `failed` snippet and `reset`; optimistic lane by hand with `$state.snapshot` rollback (or SvelteKit `command.updates(query.withOverride(…))`). |
| 15 | State across navigation | No router in plain Svelte; in SvelteKit `export const snapshot = { capture, restore }` in `+page.svelte` keeps form text and pane scroll, scroll restoration on back is built in, the filter goes in `page.state` via shallow routing (`pushState`/`replaceState` from `$app/navigation`) or the URL. No `<KeepAlive>` equivalent: heavy tabs stay mounted with `hidden` and `inert` attributes bound to the active tab and an `$effect` that pauses the loop; destroy mode is `{#key}` or `{#if}`. |
| 16 | Server functions | SvelteKit remote functions in `*.remote.ts`: `query` (cached and deduplicated per argument), `query.batch` for same-tick batching, `command` for the guarded mutation (`getRequestEvent()` for the session, `error(401)`), a Standard Schema validator as first argument for per-call validation errors, `query.live` for the subscription, all served by Kit under one route prefix; plain Svelte has nothing: keep `src/lib/rpc.js` or tRPC/oRPC with TanStack Query's Svelte adapter. |
| 17 | Sync and local-first | Nothing built in; `query.live` is server-to-client only. Keep `src/lib/sync.js` as a `.svelte.js` class with `$state` fields (outbox in IndexedDB, replay on `online`), with versions and the change feed served by SvelteKit `+server.ts` routes; TanStack DB's Svelte adapter (`@tanstack/svelte-db`) for live queries over Electric or query collections, `@tanstack/offline-transactions` for the queue. |
| 18 | Morphing and streaming HTML | Not built in; Svelte updates its own DOM fine-grained, but `{@html}` replaces the fragment and loses focus. Light: `morph()` from `src/lib/morph.js` or idiomorph on a `bind:this` node inside `$effect`; produce the fragment with `render()` from `svelte/server` in a `+server.ts` route; heavy: return a `ReadableStream` of chunks from `+server.ts` and morph per chunk by hand; `moveBefore` is a direct DOM call (`animate:flip` is the Svelte-side reorder). |
| 19 | Platform navigation | Light: a SvelteKit page with `prerender = true` and `csr = false` (no JS shipped, links are full navigations), `@view-transition` in CSS, `rel="expect"` and speculation rules in `<svelte:head>`. Heavy: Kit's router uses the History API (`beforeNavigate` with `cancel()`, `afterNavigate`, scroll and focus handled, `onNavigate` + `document.startViewTransition`), the shell for `/navigation/app/*` is a `[...rest]` route with `ssr = false`; a Navigation API + URLPattern router stays the baseline's `navigation-heavy.js`, mounting Svelte views with `mount`/`unmount`. |
| 20 | Error boundaries | `<svelte:boundary>` per section with a `failed` snippet (`error, reset`) and an `onerror` handler; exponential backoff by scheduling `reset()` from `onerror`, then a button for the manual retry; fingerprint and count in a `.svelte.js` store; light: `window.onerror`/`unhandledrejection` as in the baseline, or SvelteKit's `handleError` in `hooks.client.ts`/`hooks.server.ts` plus `+error.svelte`. Boundaries catch render and effect errors, not errors thrown in event handlers. |
| 21 | Observability | Plain Svelte: `$inspect` and `$inspect.trace()` for dev-time reactivity tracing, otherwise nothing; light: `web-vitals` or the baseline's observers unchanged; heavy: `setHeaders({ 'Server-Timing': … })` in `load` or on the `+server.ts` response, client spans by hand; SvelteKit's tracing (`tracing.server: true` in the plugin options, since 2.31) emits spans for `handle`, server and universal `load`, form actions, `+server` handlers and remote functions, with `src/instrumentation.server.ts` wiring the exporter and `event.tracing.root`/`current` for annotations, which supplies the server half of the trace. |
| 22 | Security hardening | Compiled components use no `eval`; SvelteKit `kit.csp` (`mode` hash, nonce or auto, plus `directives`) hashes or nonces Kit's own inline bootstrap, so the theme script gets the same treatment; Kit rejects cross-origin form submissions unless the origin is in `csrf.trustedOrigins` (Kit 3 removed `checkOrigin`), the double-submit token as in the baseline if you want it; `{@html}` is unescaped: run the baseline sanitiser or DOMPurify through a Trusted Types policy; Svelte builds templates with `innerHTML` on a `<template>` by default, so Trusted Types enforcement needs the `fragments: 'tree'` compiler option (since 5.33). |
| 23 | Styling strategy | `<style>` is scoped per component by default (class hashing; `:global()` opts out), which already gives the slot boundary: snippet content rendered by a parent keeps the parent's scope; `style:` and `class:` directives, custom properties passed to components (`<Card --accent="…">`); no CSS Modules of its own (Vite's `.module.css` works); tokens, `light-dark()`, layers, `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through; Tailwind 4 via `@tailwindcss/vite` (`sv add tailwindcss`). |
| 24 | Agent-ready UI | Nothing built in: `$effect` registers the tool and its cleanup forgets it; in SvelteKit a remote function's Standard Schema validator doubles as the tool's `inputSchema` and the function as its `execute`, the closest any candidate comes to deriving tools; the Svelte MCP server serves the coding agent, not the page. |

## Migrating the baseline

1. `npx sv create app` (SvelteKit) or `npm create vite@latest -- --template svelte-ts` for plain Svelte; keep `mockApi()` in `vite.config`.
2. Partials become `+layout.svelte` (Kit) or layout components; pages become routes.
3. `store.js` → a `.svelte.js` module exporting `$state`; `router.js` → SvelteKit routing; `api.js` → `load` functions or TanStack Query; `toast.js` → a store + component.
4. `h()` calls become templates; keep `rows.js` and the worker.

## From the 2025–26 blog

Async Svelte (`await` in components), remote functions (`query`, `form`, `command`, `prerender`, `query.batch`, `query.live`), OpenTelemetry tracing integrated in SvelteKit, a Svelte MCP server and community CLI plugins. Port pattern 3 twice: with the mock API and with remote functions.

## Measured, 2026-10-12 (`impl/svelte`)

Patterns 1 to 4 light, the board and the dashboard, Svelte 5.57 (runes) on Vite 8, measured the same way as the baseline and the React port on the same machine (headless Chrome; full table in `impl/svelte/README.md`).

| | Baseline | React | Svelte |
|---|---|---|---|
| Static light, shipped gzip | 6.6 kB, no JS | 73.3 kB | 23.3 kB, of which 17.2 kB is the runtime plus layout |
| State heavy, shipped gzip | 11.6 kB | 76.7 kB | 27.1 kB (4.2 kB of page code against 3.7) |
| Board render after "Add 300 cards" / second 300 / filter keystroke | 16.1 / 22.6 / 5.3 ms | 14.6 / 14.0 / 3.0 ms | 15.3 / 11.8 / 11.8 ms |
| Dashboard at 30 Hz: renders per second and render time, patch / rebuild | 31, 0.6 ms / 32, 1.4 ms | 31, 0.8 ms / 31, 1.4 ms | 31, 0.6 ms / 31, 1.4 ms |
| Real-time heavy, shipped gzip and lines | 10.3 kB, 238 lines | 75.4 kB, 155 lines | 26.3 kB, 148 lines |
| Lines for the board page | 273 plus `store.js` and `dom.js` | 225 | 219, neither needed |
| Works without JavaScript | static and forms light | none | none |

What it decided: client rendering with a runtime a quarter of React's (prerendering through SvelteKit is what makes the light pages count), compiled fine-grained updates (the 606-card re-render is the fastest of the three; the filter keystroke over a derived keyed list is not, and is the first thing to profile), effects that run after the DOM update (timing a render is one `$effect`), explicit deep versus raw state. Where it fought: `export const` in a runes script, the dialog's uncontrolled fields, drag-and-drop classes, focus after a keyboard move, and the inline theme script and `<title>` that stay in the HTML file.

## Watch out for

- `$effect` is for side effects, not for deriving state; put derived values in `$derived`.
- `$state` deep proxies cost on large arrays (grid, dashboard): use `$state.raw` and reassign.
- Svelte 4 stores still work but are the old model; decide whether the port uses runes only.
- Smaller component ecosystem than React; headless libraries exist but fewer full kits.
- SvelteKit 3 shipped very recently (Svelte 5, Node 22 and TypeScript 6 required; `#lib` replaces `$lib`); see sveltekit.md.

- TypeScript 7.0 (2026-07-08) is the native Go compiler, 8 to 12 times faster on full builds but without a programmatic API until 7.1, stricter defaults (`strict` on, `module: esnext`) and removed options (`baseUrl`, `target: es5`); Svelte's language tooling still needs the TypeScript 6 API (`@typescript/typescript6` installed as an alias) for editor and template support, so run 7 for `tsc` and 6 for the editor until the maintainers add support.

## Links

- https://svelte.dev
- https://threlte.xyz, https://bits-ui.com
