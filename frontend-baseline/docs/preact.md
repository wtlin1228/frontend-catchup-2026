# Preact

| | |
|---|---|
| Kind | 3–4 kB React-compatible UI library. Meta-framework: Fresh (Deno). |
| Version checked (2026-10-05) | preact 11.0.0 (new major in 2026); @preact/signals 2.11.3 |
| Reactivity | Virtual DOM like React; optional fine-grained updates with `@preact/signals` (signals bound in JSX skip the component re-render). |
| Rendering | Client; SSR with `preact-render-to-string`; islands via Fresh or Astro. |
| Best at | React's API at a fraction of the size; sprinkles and islands. |

## Pattern map

| # | Pattern | How you build it in Preact |
|---|---|---|
| 1 | Static content | Islands or prerendering (`@preact/preset-vite` has a prerender option); Fresh and Astro give static output by default. |
| 2 | Forms | Native inputs; React Hook Form via `preact/compat`; keep the plain form working yourself. |
| 3 | Dynamic | `preact-iso` (router + lazy + prerender helpers), or React Router via compat; TanStack Query works through compat. |
| 4 | Client state | `@preact/signals` (`signal`, `computed`, `effect`, deep signals via `@preact/signals-core` helpers) or Zustand via compat; undo via snapshots. |
| 5 | 3D | `useRef` + `useEffect`; react-three-fiber works via compat with caveats; dynamic `import()` for the chunk. |
| 6 | Real-time | Signals updated from the EventSource handler bind straight to text nodes and SVG attributes: close to the baseline's patch strategy. |
| 7 | Media | Plain `<img>`; native dialog; `createPortal` from `preact/compat`. |
| 8 | Cross-cutting | Context, or a module of signals; `preact-i18n` or i18next. |
| 9 | Content | Fresh or Astro for collections; MDX via Vite. |
| 10 | Data grid | TanStack Table/Virtual via compat; workers via Vite. |
| 11 | Composite widgets | React Aria / Radix via compat (test each), or hand-written as in the baseline. |
| 12 | Motion | Motion via compat; FLIP by hand. |
| 13 | Offline | `vite-plugin-pwa`. |
| 14 | Async consistency | Light: hold the last-good result in a signal plus a `pending` signal to dim it, latest-wins with an AbortController or a request counter; TanStack Query via compat gives `placeholderData: keepPreviousData`. Heavy: `Promise.all` the three sources and write them inside `batch()` from `@preact/signals` so the view commits once; optimistic lane as a signal write restored from a snapshot on failure; per-source retry and request versioning by hand as in the baseline's `async-heavy.js`; `useTransition`/`startTransition` exist in `preact/compat` only as pass-through shims, so there is no pending-while-rendering state to lean on (verify). |
| 15 | State across navigation | Light: `preact-iso`'s `Router` tracks the URL with the History API; keep the filter in the query (`useLocation().query`) and restore scroll by hand from `history.state`. Heavy: no `<Activity>`; keep the three tabs mounted and toggle `hidden`/`inert` as the baseline does, pause the rAF loop in the effect cleanup, or hold tab state in module-level signals so the destroy-and-recreate mode still restores input; check what `preact-iso` does to scroll on route change (verify). |
| 16 | Server functions | Nothing built in: no `"use server"` in Preact, and Fresh gives route handlers rather than callable server functions. Light: keep `src/lib/rpc.js`, or tRPC/oRPC (TanStack Query via compat) or Hono's `hc` client for typed calls. Heavy: the baseline's batching, in-flight dedup and `rpc.live` SSE already do what tRPC's `httpBatchLink` and `httpSubscriptionLink` do; feed `live` into a signal; validation and auth stay in `scripts/mock-api.js`'s dispatch table. |
| 17 | Sync and local-first | Nothing built in. Light: `src/lib/sync.js` with its `onChange` writing a signal, which is the natural Preact binding. Heavy: the same client for outbox, versions and conflicts; TanStack DB (`useLiveQuery`), Replicache or Zero through `preact/compat`, or Yjs/Automerge bound to signals, all untested with Preact 11 (verify). |
| 18 | Morphing and streaming HTML | Nothing built in; `dangerouslySetInnerHTML` resets focus and input. Light: a container rendered once (`useMemo`'d element or `shouldComponentUpdate` returning false) and morphed with `src/lib/morph.js` or idiomorph. Heavy: read `response.body` chunk by chunk and morph by hand; `preact-render-to-string` streams Preact's own output, not server fragments (verify). |
| 19 | Platform navigation | Light: no script; prerendered HTML from `@preact/preset-vite`, Fresh or Astro must carry `<link rel="expect">`, speculation rules and `@view-transition`. Heavy: `preact-iso` uses the History API; a Navigation API router is hand-rolled: `navigate` event + `URLPattern`, the current route in a signal, `document.startViewTransition` around the swap (Preact debounces hook updates, so call `render()` directly inside the callback); the shell under `/navigation/app` comes from Vite's SPA fallback or the host's rewrite (verify). |
| 20 | Error boundaries | Light: `window.onerror`/`unhandledrejection` by hand; Preact has no root-level error callbacks. Heavy: `useErrorBoundary()` from `preact/hooks` (returns `[error, resetError]`) or `componentDidCatch` per section; `resetError` is the manual retry, backoff and fingerprinting are yours; `react-error-boundary` via compat if you want `resetKeys`. |
| 21 | Observability | Light: `web-vitals` or the baseline's PerformanceObserver code; Preact Devtools' profiler for component cost, no Performance Tracks. Heavy: `@opentelemetry/sdk-trace-web` + `@opentelemetry/instrumentation-fetch`, `PerformanceResourceTiming.serverTiming` for the mock API's Server-Timing; time renders with `performance.mark` in `options.diffed` (the hook Preact Devtools uses) or around `render()`. |
| 22 | Security hardening | Light: a Vite Preact SPA emits no inline script, so a hash CSP works once the theme script is hashed (`{{csp-hashes}}`). Heavy: Preact writes HTML only via `dangerouslySetInnerHTML`, so pass DOMPurify output (`RETURN_TRUSTED_TYPE`) under Trusted Types; CSRF double-submit is a header in your `fetch` wrapper, nothing in Preact or `preact-iso`; whether `@preact/preset-vite` prerendering and Fresh's hydration scripts take a nonce or hash needs checking (verify). |
| 23 | Styling strategy | Light: the baseline's CSS imports unchanged; `class` and `className` both work. Heavy: no built-in scoping; CSS Modules via Vite or Tailwind 4; `goober` is the Preact-sized CSS-in-JS if you need runtime styles; `@scope`, container queries, `@property` and `:has()` are plain CSS as in the baseline. |

## Migrating the baseline

1. `npm create preact@latest` or Vite's preact template; alias `react` to `preact/compat` only if you pull in React libraries.
2. Same shape as the React port; replace `useState` with signals where the heavy pages need fine-grained updates.

## From the 2025–26 blog

Preact 11: Hydration 2.0, `Object.is` dependency checks, components may return nothing or fragments; `preact-iso` replaces `preact-router`; Vite replaces `preact-cli`; a security patch in January 2026.

## Watch out for

- Preact 11 is a fresh major: check the changelog for removed APIs before trusting compat with older libraries.
- Compat gaps: no Server Components, some React 19 APIs; every React library is "probably works, test it".
- Hooks come from `preact/hooks`, not `preact`.
- Fresh is Deno-only; for Node, Astro is the usual islands host.

## Links

- https://preactjs.com, https://preactjs.com/guide/v10/signals
- https://fresh.deno.dev
