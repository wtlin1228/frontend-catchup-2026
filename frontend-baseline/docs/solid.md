# Solid

| | |
|---|---|
| Kind | UI library with fine-grained reactivity; JSX compiled to direct DOM updates. Meta-framework: SolidStart. |
| Version checked (2026-10-05) | solid-js 1.9.15; 2.0.0 at release candidate (new reactive core, async primitives); @solidjs/start 2.0.5 |
| Reactivity | Signals: `createSignal`, `createMemo`, `createEffect`, `createResource`, `createStore` (nested proxies). Components run once. |
| Rendering | Client with Vite; SSR, streaming and islands via SolidStart. |
| Best at | Raw update performance with a React-like syntax; small runtime. |

## Pattern map

| # | Pattern | How you build it in Solid |
|---|---|---|
| 1 | Static content | Layout components; static HTML needs SolidStart prerendering. |
| 2 | Forms | Native inputs with `onInput`; `@modular-forms/solid` or TanStack Form; SolidStart `action` + `useSubmission` for progressive enhancement. |
| 3 | Dynamic | `@solidjs/router` (data APIs: `query`, `action`, preload) or TanStack Router; `createResource` with `<Suspense>`; TanStack Query (Solid adapter). |
| 4 | Client state | `createStore` with `produce` for nested updates; undo via snapshots (`unwrap`); `<For>` is keyed by reference, `<Index>` by position. |
| 5 | 3D | `onMount` + `onCleanup` with a ref; solid-three exists but is less mature than R3F/TresJS; `lazy()` for the chunk. |
| 6 | Real-time | `createEffect` + `onCleanup` for the EventSource; a signal per metric already updates only its DOM nodes, so the patch strategy is the default. |
| 7 | Media | Plain `<img>`; `<Portal>` for overlays or native dialog; IntersectionObserver in `onMount`. |
| 8 | Cross-cutting | `createContext`; router guards via `preload`/redirects; `@solid-primitives/i18n`. |
| 9 | Content | `solid-mdx` with Vite; SolidStart file routes; collections by hand. |
| 10 | Data grid | TanStack Table + Virtual (Solid adapters); workers via Vite. |
| 11 | Composite widgets | Kobalte (headless), Ark UI; solid-ui copies Kobalte-based components. |
| 12 | Motion | `solid-transition-group`, Motion for Solid, `@solid-primitives/transition-group`; FLIP by hand as in the baseline. |
| 13 | Offline | `vite-plugin-pwa`. |
| 14 | Async consistency | Light: `createResource` keeps `latest` while refetching and discards out-of-order results; wrap the tab switch in `useTransition()` so the old content stays under `<Suspense>` and `pending()` dims it; `createAsync` from `@solidjs/router` on 1.9. Heavy: 1.9: three resources under one `<Suspense>` commit together, `refetch` per resource for retry, optimistic lane as a `createStore` write rolled back from a snapshot; 2.0 RC does this natively: async computations, `<Loading>`, `action()` optimistic lanes, retry from the failed source. |
| 15 | State across navigation | Light: `useSearchParams` from `@solidjs/router` for the filter; scroll restoration by hand (`history.scrollRestoration`, save `scrollY` in `history.state`); `<A noScroll>` stops the router's scroll-to-top. Heavy: no `<KeepAlive>`/`<Activity>`; components run once, so keep the three tabs mounted and toggle `hidden`/`inert` instead of `<Show>` (which disposes), pause the rAF loop with `createEffect` + `onCleanup` keyed on the active tab, or lift tab state into a module-level `createStore` so the destroy-and-recreate mode restores input. |
| 16 | Server functions | Light: SolidStart `"use server"` inside a function called from the component; `query()` and `action()` from `@solidjs/router` wrap it with cache keys, revalidation and `useSubmission`; one POST per call. Heavy: `query` dedupes identical in-flight calls, but nothing batches same-tick calls (keep the baseline's `rpc.js` batching or tRPC); validation errors thrown from the function and read from `useSubmission().error`; auth via `getRequestEvent()`; SSE through an API route (`export function GET`) returning a `ReadableStream`, or 2.0's live streams; server functions returning streams or async iterators need checking (verify). |
| 17 | Sync and local-first | Nothing built in. Light: `src/lib/sync.js` with `onChange` writing into a `createStore` via `reconcile`, so only changed notes update. Heavy: the same client for outbox, versions and conflicts; TanStack DB's Solid adapter (`useLiveQuery`), Zero, LiveStore or Yjs/Automerge bound to a store, a thinner set of adapters than React's (verify). |
| 18 | Morphing and streaming HTML | Nothing built in; the `innerHTML` prop resets focus and input. Light: a `ref` node outside the reactive tree morphed with `src/lib/morph.js` or idiomorph. Heavy: read `response.body` in chunks and morph by hand; `renderToStream` (`solid-js/web`, SolidStart) streams Solid's own Suspense boundaries and 2.0's live streams carry data, not HTML fragments; `<For>` reorders with `insertBefore`, not `moveBefore` (verify). |
| 19 | Platform navigation | Light: no script; SolidStart prerendered pages (or plain HTML next to the Vite SPA) must emit `<link rel="expect">`, speculation rules and `@view-transition`. Heavy: `@solidjs/router` sits on the History API; a Navigation API router is hand-rolled: `navigate` event + `URLPattern`, the matched route in a signal, `document.startViewTransition` around the signal write (Solid commits synchronously, no flush step), `useTransition` to hold the old view until data arrives; the shell under `/navigation/app` comes from a `[...path]` catch-all route in SolidStart or Vite's SPA fallback. |
| 20 | Error boundaries | Light: `window.onerror`/`unhandledrejection` by hand; `catchError` for errors inside a reactive scope. Heavy: `<ErrorBoundary fallback={(err, reset) => ...}>` per section, `reset` is the manual retry and `setTimeout(reset, backoff)` the automatic one, `refetch` on the failed resource; fingerprinting is yours; 2.0 RC adds self-healing retry from the failed source. |
| 21 | Observability | Light: `web-vitals` or the baseline's PerformanceObserver code; Solid DevTools (extension + Vite plugin) for the reactive graph, no Performance Tracks equivalent. Heavy: `@opentelemetry/sdk-trace-web` + `@opentelemetry/instrumentation-fetch` for the two request spans, `PerformanceResourceTiming.serverTiming` for Server-Timing, `performance.mark` around the signal write; in SolidStart the server span is the OTel Node SDK around the `"use server"` body, nothing is integrated (verify). |
| 22 | Security hardening | Light: a Vite Solid SPA emits no inline script, so a hash CSP works once the theme script is hashed (`{{csp-hashes}}`); SolidStart inlines the hydration script and serialised data, so pass a nonce (`<HydrationScript nonce>`). Heavy: Solid writes HTML only through the `innerHTML` prop, so sanitise with DOMPurify (`RETURN_TRUSTED_TYPE`) first; CSRF double-submit is a header in your `fetch` wrapper or a hidden field the `action` checks via `getRequestEvent().request`; whether SolidStart's nonce option covers every injected script needs checking (verify). |
| 23 | Styling strategy | Light: the baseline's CSS imports unchanged; `class` and `classList` props. Heavy: no built-in scoping; CSS Modules via Vite or Tailwind 4 are the defaults, vanilla-extract/Panda for typed zero-runtime styles; `@scope`, container queries, `@property` and `:has()` are plain CSS as in the baseline; Solid's JSX has no `className`. |

## Migrating the baseline

1. `npm create solid@latest` (SolidStart) or the Vite solid template; keep `mockApi()`.
2. Partials become layout components; pages become routes.
3. `store.js` → `createStore`; `router.js` → `@solidjs/router`; `api.js` → `createResource`/`query`; `toast.js` → a signal + `<Portal>`.

## From the 2025–26 blog

Solid 2.0 (RC, 2026) makes async native: computations return promises, `<Loading>` replaces `<Suspense>`, `action()` with optimistic lanes, projections, self-healing retry, one reactive graph across server and client. It is the reference implementation for the async-consistency candidate pattern.

## Watch out for

- Destructuring props breaks reactivity; use `splitProps`/`mergeProps` and read `props.x` inside JSX.
- `.map`, ternaries and early returns in JSX do not track; use `<For>`, `<Show>`, `<Switch>`.
- Solid 2.0 changes the async model (resources, `createAsync`, transitions); check which version the port targets and note it.
- Smaller ecosystem; expect to write more primitives yourself on the widgets and motion pages.

## Links

- https://www.solidjs.com, https://start.solidjs.com
- https://kobalte.dev
