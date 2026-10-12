# Qwik

| | |
|---|---|
| Kind | Resumable framework with its own router (Qwik City / Qwik Router). |
| Version checked (2026-10-12) | @builder.io/qwik 1.20.2 (v1 line); @qwik.dev/core and @qwik.dev/router 2.0.0-rc.2 (v2 line, new package names) |
| Reactivity | Signals (`useSignal`, `useStore`, `useComputed$`, `useTask$`) with serialisable state; no hydration: the app resumes from HTML. |
| Rendering | SSR/SSG by default; code is split at every `$` boundary and loaded on interaction. |
| Best at | Minimal JavaScript on first load regardless of app size. |

## Pattern map

| # | Pattern | How you build it in Qwik |
|---|---|---|
| 1 | Static content | Default output: HTML with almost no JS; `routes/layout.tsx` for layouts; static adapter for prerendering. |
| 2 | Forms | `routeAction$` with `Form` (progressive by default), `zod$` validation, `useSignal` for client state. |
| 3 | Dynamic | `routeLoader$` runs on the server per request; `useNavigate`, `Link` with prefetch; `server$` for RPC; optimistic UI by hand with signals. |
| 4 | Client state | `useStore` (deep) or `useSignal`; undo via serialisable snapshots; `useContextProvider` for sharing. |
| 5 | 3D | `useVisibleTask$` (runs eagerly in the browser) with a ref and cleanup; three.js stays an ordinary import inside the task. |
| 6 | Real-time | `useVisibleTask$` opens the EventSource; signals update the DOM; the serialisation boundary means handlers must not close over non-serialisable objects. |
| 7 | Media | `<Image>` from `@unpic/qwik` or `qwik-image`; native dialog via ref. |
| 8 | Cross-cutting | `plugin@*.ts` middleware for sessions and redirects; context for theme; `compiled-i18n` / `qwik-speak`. |
| 9 | Content | MDX supported natively in routes; collections via `import.meta.glob`. |
| 10 | Data grid | Hand-written virtual list (as in the baseline) or TanStack Virtual core; workers via Vite. |
| 11 | Composite widgets | Qwik UI (headless + styled). |
| 12 | Motion | CSS and WAAPI by hand; no built-in transition primitives. |
| 13 | Offline | Qwik City service worker helper for prefetching; `vite-plugin-pwa` for caching. |
| 14 | Async consistency | Light: SPA navigations are all-or-nothing, so a tab that is a route keeps the old page until `routeLoader$` resolves, with `useLocation().isNavigating` to dim; within one page, `useTask$` tracking the tab signal with `cleanup()` aborting the previous `fetch` (latest wins) and the last good value kept in a store, rather than `<Resource>`, whose `onPending` flashes. Heavy: one `routeLoader$` awaiting all three sources is the atomic commit; streaming is a loader per source that returns an async function (deferred: the page renders first and `<Resource value={data} onResolved>` fills in when it resolves); retry by re-running the source; optimistic lane by writing the store first and restoring on a rejected `server$` call. |
| 15 | State across navigation | Qwik Router restores scroll on back and forward; the filter lives in `useLocation().url.searchParams`, written with `useNavigate()` (`replaceState: true`). Heavy: no keep-alive, but state is serialisable and lives in stores, so a re-rendered tab resumes from its store rather than from scratch; keep the three tabs rendered with `hidden` and `inert` and pause the loop in `useVisibleTask$` cleanup tracking the active signal; conditional rendering is the destroy mode. |
| 16 | Server functions | `server$` is the native server function: a closure called from the client, `this` is the `RequestEvent` (`this.cookie` for the session, `this.error(401)`), one POST per call, async generators stream back; `routeAction$` with `zod$` for validated mutations. Nothing batches or dedupes same-tick calls: keep `rpc.js`'s queue in front of `server$`, or accept one request per call and record the difference. Light: one `server$` call replaces `rpc.js`. |
| 17 | Sync and local-first | Nothing built in. `src/lib/sync.js` runs inside `useVisibleTask$` with its state mirrored into a `useStore` (plain objects serialise; keep the `EventSource` out of the store); the versioned log and the change feed are endpoints (`onGet` writing to `requestEvent.getWritableStream()`, which the docs show for server-sent events) or a streaming `server$`; TanStack DB has no Qwik adapter. |
| 18 | Morphing and streaming HTML | `dangerouslySetInnerHTML` replaces the subtree and loses focus; morph by hand with `src/lib/morph.js` or idiomorph on a `useSignal<Element>()` ref inside `useVisibleTask$`. Heavy: read the fragment stream with a `fetch` reader and morph per chunk; Qwik's own streaming (`renderToStream`) streams its container, not fragments; `moveBefore` is a direct DOM call. |
| 19 | Platform navigation | Light: Qwik ships almost no JS already; `rel="expect"` and speculation rules go in `root.tsx`'s `<head>`, `@view-transition` in `global.css`; `<PrefetchServiceWorker>` prefetches Qwik's own bundles, not pages. Heavy: Qwik Router does SPA navigation on the History API (`Link` with `prefetch`, `useNavigate` with `replaceState`, `scroll` and `forceReload` options) and wraps navigations in the View Transitions API by default (`viewTransition` on `<QwikCityProvider>`, default `true`); the shell for `/navigation/app/*` is a `[...rest]` catch-all route; a Navigation API + URLPattern router stays the baseline's code. |
| 20 | Error boundaries | `useErrorBoundary()` returns an `ErrorBoundaryStore` whose `error` drives a fallback per section, and clearing it retries; `<Resource onRejected>` for loader-style failures; backoff and fingerprinting by hand; route-level: the nearest boundary in a layout and `fail()` from actions. Light: `window.onerror` and `unhandledrejection` as in the baseline; the core API reference documents no global error hook. |
| 21 | Observability | Qwik Insights (Labs, prototyping stage) collects symbol load timings to regroup bundles and order prefetching, which is Qwik-specific and not a trace; light: `web-vitals` or the baseline's observers; heavy: `@opentelemetry/sdk-trace-web` with fetch instrumentation, `Server-Timing` set in a `plugin@*.ts` middleware (`requestEvent.headers.set`), `performance.mark` around the store write; the server half of a `server$` call has no documented span, so wrap it yourself. |
| 22 | Security hardening | Resumability inlines the serialised state (`<script type="qwik/json">`) and, since 1.15, loads the qwikloader as a separate bundle unless `qwikLoader: 'inline'`, so the CSP needs a per-request nonce: the documented pattern is an `onRequest` handler that generates it, stores it in `event.sharedMap` under `@nonce` and sets a `'strict-dynamic'` `script-src` (own scripts read it with `useServerData('nonce')`); nonces do not work with SSG, so prerendered pages fall back to hashes; `dangerouslySetInnerHTML` is yours to sanitise and the docs say nothing about Trusted Types; `routeAction$` and `server$` check the `Origin` header by default, the double-submit token as in the baseline on top. |
| 23 | Styling strategy | `useStylesScoped$` (class-based scoping; `<Slot/>` content keeps the parent's scope, which is the slot boundary for free) and `useStyles$` (global, deduplicated); Vite's `.module.css` and Tailwind via `qwik add tailwind`; global tokens, `light-dark()` and layers in `global.css`; `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through. |
| 24 | Agent-ready UI | Nothing built in: `useVisibleTask$` registers (the tool's `execute` may close over serialisable state only); a `routeAction$`'s `zod$` schema is the natural `inputSchema` and the action its `execute`. |

## Migrating the baseline

1. `npm create qwik@latest`; keep `mockApi()` in `vite.config` or move endpoints to `routes/api/*/index.ts`.
2. Layouts are `layout.tsx` files; pages are route folders.
3. `api.js` → `routeLoader$`/`server$`; `store.js` → `useStore`; `router.js` → Qwik Router; `toast.js` → a context + signal.

## Watch out for

- Everything crossing a `$` boundary must be serialisable; closures over DOM nodes, class instances or functions fail at build or runtime.
- First interaction can lag while the handler chunk loads; measure it on the board page.
- v1 (`@builder.io/*`) and v2 (`@qwik.dev/*`) differ in package names and some APIs; pick one and record it. Governance moved from Builder to a community team; check release cadence.
- Smaller ecosystem; React components can be embedded with `qwikify$` at the cost of hydration for that island.

## Links

- https://qwik.dev
