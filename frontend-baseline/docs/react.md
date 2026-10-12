# React

| | |
|---|---|
| Kind | UI library: components and rendering only. Routing, data and a server come from a meta-framework (Next.js, React Router framework mode, TanStack Start) or libraries. |
| Version checked (2026-10-12) | react 19.3.0 (2026-09-09: stable View Transitions, Fragment refs, `browser()`) |
| Reactivity | Re-render and diff (virtual DOM). React Compiler (stable since late 2025) adds automatic memoisation. |
| Rendering | Client with Vite; SSR, SSG, streaming and Server Components only through a meta-framework. |
| Best at | Ecosystem size, hiring, a component model everyone already knows. |

## Pattern map

| # | Pattern | How you build it in React |
|---|---|---|
| 1 | Static content | With Vite alone the page is an empty `<div>` until JS runs. For real static HTML use a meta-framework or Vike. Layouts are components. |
| 2 | Forms | Uncontrolled inputs plus `FormData`; React 19 Actions: `<form action={fn}>`, `useActionState`, `useFormStatus`, `useOptimistic`. React Hook Form for large forms. Uploads: `XMLHttpRequest` in an effect, as in the baseline. |
| 3 | Dynamic data and routing | React Router (data mode: loaders/actions) or TanStack Router; TanStack Query or SWR for cache, prefetch, invalidation and optimistic mutations; `Suspense` and `use()` for loading states. |
| 4 | Client state | `useReducer` + Context, or Zustand/Jotai/Redux Toolkit; immutable updates (Immer); undo as reducer history; `useSyncExternalStore` for localStorage and cross-tab sync. |
| 5 | 3D | `useRef` + `useEffect` with cleanup, or react-three-fiber + drei; `React.lazy` for the chunk. Dev StrictMode mounts twice: the scene must be idempotent. |
| 6 | Real-time | `useEffect` subscription + `useSyncExternalStore`; keep 30 Hz data in refs or an external store and commit per frame; `useDeferredValue` / `startTransition` to keep input responsive. |
| 7 | Media | Plain `<img>` attributes; `next/image` or unpic in meta-frameworks; native `<dialog>` via ref; IntersectionObserver in an effect or `react-intersection-observer`. |
| 8 | Cross-cutting | Context providers for theme, i18n and session; guards as loader redirects; theme without flash still needs the inline script (or `next-themes`); i18n via react-intl, i18next or Lingui. |
| 9 | Content | MDX via `@mdx-js/rollup` in Vite; collections, feeds and search come from the meta-framework (Next, Astro) or your own script, as in the baseline. |
| 10 | Data grid | TanStack Table + TanStack Virtual (or react-window); worker with Vite's `new Worker(new URL())`; selection state outside the row components. |
| 11 | Composite widgets | Radix UI, React Aria, Headless UI, Ark; shadcn/ui copies Radix-based components into your tree. |
| 12 | Motion | Motion (formerly Framer Motion) for layout/FLIP animations and `AnimatePresence`; `<ViewTransition>` (stable in 19.3, with `addTransitionType` for per-cause animations) animates enter, exit, update and shared elements inside a Transition; `document.startViewTransition` with `flushSync` otherwise. |
| 13 | Offline | `vite-plugin-pwa` (Workbox) or Serwist; the manifest is static. |
| 14 | Async consistency | Light: `useTransition` around the tab change so the old content stays (dim on `isPending`), `useDeferredValue`; latest-wins with an AbortController in the effect or TanStack Query `placeholderData: keepPreviousData`. Heavy: one `<Suspense>` boundary with three `use(promise)` reads commits together; `useOptimistic` rolls back when the action throws (verified in `impl/react`: it reverts even when the error is caught, and state set after an `await` must be wrapped in `startTransition` again); per-source retry and request versioning are not React's job: TanStack Query `retry`/`refetch` or the baseline's `async-heavy.js` logic. |
| 15 | State across navigation | Light: the router restores scroll and the filter lives in the URL: React Router `<ScrollRestoration>` + `useSearchParams`, TanStack Router `scrollRestoration` + typed search params. Heavy: `<Activity mode="hidden">` (19.2) keeps the three tabs mounted with their state and unmounts their effects while hidden, so the rAF loop stops in its cleanup; React's default (unmount on route change) is the destroy-and-recreate mode. |
| 16 | Server functions | Light: `"use server"` functions called from a client component (React 19) need an RSC bundler, i.e. a meta-framework; in a Vite SPA keep `src/lib/rpc.js`, or tRPC/oRPC with TanStack Query. Heavy: server functions do not batch, dedupe or subscribe; tRPC `httpBatchLink` for batching, TanStack Query for in-flight dedup, SSE via tRPC `httpSubscriptionLink` or the baseline's `rpc.live`; validation errors thrown from the function (Zod), auth from the request context the meta-framework provides. |
| 17 | Sync and local-first | Nothing built in. Light: keep `src/lib/sync.js` and expose it with `useSyncExternalStore`. Heavy: TanStack DB (collections with optimistic mutations, `useLiveQuery`, Electric/Query sync) is React-first; Replicache, Zero, LiveStore or Yjs/Automerge bound with `useSyncExternalStore`; the SSE change feed stays the baseline's. |
| 18 | Morphing and streaming HTML | Nothing built in: React reconciles its own tree, and `dangerouslySetInnerHTML` resets focus and input. Light: a `ref`'d container React never re-renders, morphed with `src/lib/morph.js` or idiomorph. Heavy: progressive HTML chunks read from `response.body` and morphed by hand; React's own streaming (`renderToPipeableStream`/`renderToReadableStream` with Suspense, via a meta-framework) streams its own boundaries, not arbitrary server fragments. |
| 19 | Platform navigation | Light: no script, so React is not involved; the meta-framework (or plain HTML next to the Vite SPA) must emit `<link rel="expect">`, speculation rules and `@view-transition`. Heavy: React Router and TanStack Router sit on the History API, not the Navigation API; a Navigation API router is hand-rolled: `navigation.addEventListener('navigate')` + `URLPattern`, route state in `useState`, `document.startViewTransition` with `flushSync` (or `<ViewTransition>`, stable since 19.3, see row 12); Vite's SPA fallback or the framework's rewrite serves the shell under `/navigation/app`. |
| 20 | Error boundaries | Light: `createRoot(el, { onUncaughtError, onCaughtError, onRecoverableError })` (React 19) plus `window.onerror`/`unhandledrejection` by hand, since React only reports render errors. Heavy: a class boundary (`getDerivedStateFromError`, `componentDidCatch`) or `react-error-boundary` (`resetKeys`, `useErrorBoundary`) per section; retry resets the boundary, backoff and fingerprinting are yours; no hook-based boundary in React itself. |
| 21 | Observability | Light: `web-vitals` (`onLCP`, `onINP`, `onCLS`) or the baseline's PerformanceObserver code; `<Profiler onRender>` and React 19.2 Performance Tracks in the Chrome performance panel for render cost. Heavy: `@opentelemetry/sdk-trace-web` + `@opentelemetry/instrumentation-fetch` for the two request spans, `PerformanceResourceTiming.serverTiming` for the mock API's Server-Timing, `performance.mark`/`measure` around the commit; nothing in React exports a trace. |
| 22 | Security hardening | Light: a Vite React SPA emits no inline script, so a hash CSP passes once the theme script is hashed (`{{csp-hashes}}`); SSR and RSC payloads from a meta-framework are inline and need its nonce plumbing. Heavy: React writes HTML only through `dangerouslySetInnerHTML`, and since 19.3 it no longer coerces values to strings before injecting them, so a `TrustedHTML` from DOMPurify (`RETURN_TRUSTED_TYPE`) or the baseline sanitiser's policy passes the browser's Trusted Types check; CSRF double-submit is a header in your `fetch` wrapper or a hidden input the action reads, React adds nothing. |
| 23 | Styling strategy | Light: the baseline's global CSS, tokens, `light-dark()` and `@layer` import unchanged; React adds nothing. Heavy: no built-in scoping; CSS Modules (`*.module.css`, built into Vite) or Tailwind 4 (`@tailwindcss/vite`) are the defaults, vanilla-extract/Panda/StyleX for zero-runtime typed styles; `@scope`, container queries, `@property` and `:has()` are plain CSS and work as in the baseline; runtime CSS-in-JS (Emotion, styled-components) does not fit streaming and RSC, and styled-components is in maintenance mode. |
| 24 | Agent-ready UI | Nothing built in: `registerTool` in an effect of the component that owns each action, the schema from the same Zod or Valibot schema the form uses; the baseline's registry and console port as a hook plus a component. The agent skill `create-react-router` installs helps the coding agent, not the page. |

## Migrating the baseline

1. `npm create vite@latest app -- --template react-ts`; add `htmlPartials()` is unnecessary (layouts are components) but keep `mockApi()` in `vite.config.ts`.
2. `src/partials/*` become `<Layout>`, `<Header>`, `<VariantNav>` components; the inline theme script stays inline in `index.html`.
3. Each `<pattern>/<variant>.html` becomes a route in React Router (framework mode gives SSG/SSR per route; data mode keeps a plain SPA).
4. `src/lib/store.js` → Zustand or a reducer; `router.js` → React Router; `api.js` → TanStack Query; `toast.js` → a context + portal; `elements.js` stays a custom element or becomes a component.
5. Keep `src/lib/rows.js` and the worker unchanged.

## From the 2025–26 blog

React Foundation (Linux Foundation) now owns React; Compiler 1.0; 19.2 added `<Activity>` (state that survives being hidden), Performance Tracks and `useEffectEvent`; 19.3 (2026-09-09) made `<ViewTransition>` and Fragment refs stable, added `browser()` for client-only components and lets Trusted Types objects reach the DOM; an RSC security advisory shipped in late 2025. Port the "state that survives navigation" candidate with `<Activity>`.

## Measured

Patterns 1 to 4 and 14 light, the contact form, the posts app, the board, the dashboard, the grid, the motion page and the composed view are ported in `impl/react` (React 19.3 on Vite 8, Compiler off; React Router 8 and TanStack Query 5 for the posts app). The numbers are in [results.md](results.md). What they said: the light pages cost react-dom's 67 kB gzip and ship nothing without JavaScript, so a meta-framework's prerendering is not optional for patterns 1, 2 and 9; keyed reconciliation makes the board's bulk re-render and filter keystroke cheap with no work; StrictMode's double effects need the AbortController from day one; timing a render needs a `useLayoutEffect` and a ref; the native dialog's uncontrolled fields, drag-and-drop classes, focus after a keyboard move and the inline theme script stay outside React. The posts app is where the library ecosystem shows: router plus query library turn the baseline's hand-written cache, prefetch, dependent request and optimistic like into configuration, at about 43 kB gzip more JavaScript than react-dom alone and nine times the baseline's whole page. The contact form as a React 19 form action (`useActionState`, `useFormStatus`) is 77 kB against the baseline's 12 kB and needs every field controlled, because an action's completion resets uncontrolled fields, including after a server rejection. The async pages are where React is most at home: `useDeferredValue` and `Suspense` with `use` give the light page's keep-old-content and the heavy page's atomic commit for free, `useOptimistic` reverts on its own; what bit was that updates after an `await` need their own `startTransition` and render after the optimistic one. The motion page shows what 19.3's stable `<ViewTransition>` buys: reorders, enters, exits and the layout switch are one Transition each with no FLIP code, while the spring stays hand-written; updaters that use `Math.random` run twice and bite. The grid says where the framework stops mattering: the worker sorts and the window of 30 rows renders in 1 to 3 ms in all four implementations.

## Watch out for

- Effects: dependency arrays, stale closures and StrictMode double-invocation are the top three bug sources when porting the scene and dashboard pages.
- Context triggers re-renders of every consumer; split contexts or use a store with selectors for the board.
- Hydration mismatches (theme, dates, random ids) when you move to SSR.
- Ecosystem choice fatigue: budget time for picking router, data, forms, styling and component libraries. Record what you picked.
- Baseline cost: react + react-dom is roughly 40–50 kB gzip before any page code; compare with the light static page.
- Server Components, `"use client"` and caching semantics belong to the meta-framework; see nextjs.md and react-router.md.

## Links

- https://react.dev
- https://reactrouter.com, https://tanstack.com
