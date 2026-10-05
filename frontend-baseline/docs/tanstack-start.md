# TanStack Start

| | |
|---|---|
| Kind | Full-stack meta-framework on TanStack Router (React and Solid flavours): type-safe routes and search params, loaders, server functions, SSR and streaming, deployable through Vite + Nitro-style adapters. |
| Version checked (2026-10-05) | @tanstack/react-start 1.168.60, @tanstack/solid-start 1.168.57 |
| Reactivity | React or Solid. |
| Rendering | SSR with streaming by default; selective SSR per route; SPA mode; prerendering. |
| Best at | End-to-end TypeScript: routes, search params, loaders and server functions all typed; pairs with TanStack Query, Table, Virtual, Form. |

## Pattern map

| # | Pattern | How you build it in TanStack Start |
|---|---|---|
| 1 | Static content | File routes with prerendering; `__root.tsx` and layout routes; `head()` for metadata. |
| 2 | Forms | `createServerFn` called from a submit handler (works with JS); TanStack Form for validation; plain `<form action>` to a server route for the no-JS path. |
| 3 | Dynamic | Route `loader` with `validateSearch` (typed `?q=&page=`), `useSearch`, `<Link preload="intent">`, `pendingComponent`, `errorComponent`; TanStack Query integrated for cache, invalidation and optimistic mutations. |
| 4 | Client state | TanStack Store or Zustand; keep URL state in the router. |
| 5 | 3D | Client-only components (`ssr: false` on the route) with effects; react-three-fiber. |
| 6 | Real-time | Server routes can stream SSE; client subscribes in an effect. |
| 7 | Media | Plain `<img>` or unpic. |
| 8 | Cross-cutting | Middleware on server functions and routes; `beforeLoad` for guards and redirects; cookies via server functions. |
| 9 | Content | MDX via Vite; collections by hand. |
| 10 | Data grid | TanStack Table + Virtual (same author, tight integration). |
| 11 | Composite widgets | Radix, React Aria, shadcn/ui (React); Kobalte (Solid). |
| 12 | Motion | Motion for React; view transitions supported by the router. |
| 13 | Offline | `vite-plugin-pwa`. |
| 14 | Async consistency | A navigation keeps the current route rendered until the next route's loaders resolve (`pendingComponent` only after `pendingMs`/`pendingMinMs`); the loader's `abortController` drops stale requests; React `useTransition`, `useDeferredValue`, `useOptimistic`; TanStack Query `placeholderData: keepPreviousData`, `useSuspenseQueries` to commit three sources at once, per-query `retry`, `useMutation` with `onMutate`/`onError` rollback for the optimistic lane; Solid flavour: `useTransition` and `createResource` today, Solid 2.0's async graph once it ships. |
| 15 | State across navigation | `scrollRestoration: true` on `createRouter` (`getScrollRestorationKey`; `useElementScrollRestoration` for virtual lists) and the filter in typed search params, so back restores both; loader cache (`staleTime`/`gcTime`) and the Query cache avoid refetching; no route keep-alive: React `<Activity mode="hidden">` (React 19.2) for the three tabs, hand-rolled hidden + `inert` with the animation paused in the Solid flavour; `useBlocker` guards the half-written form. |
| 16 | Server functions | `createServerFn({ method }).inputValidator(schema).handler()` called directly or through `useServerFn`; `createMiddleware({ type: 'function' })` chains for auth and request context; a failing validator throws to the caller, field errors come back as data; one POST per call to `/_serverFn`, so no batching, and deduplication comes from Query's `queryKey`; a live subscription stays an SSE server route (row 6) or a TanStack DB live query; this is exactly what the baseline's `src/lib/rpc.js` stands in for. |
| 17 | Sync and local-first | TanStack DB: `createCollection` with `queryCollectionOptions` (or `localStorageCollectionOptions` for persistence), `useLiveQuery`, `createOptimisticAction`/`createTransaction`, `onInsert`/`onUpdate`/`onDelete` handlers posting to `/api/sync` with version checks, `/api/sync/stream` events written into the collection with its write utils; a rejected handler rolls the optimistic state back; the blog's offline queue and SQLite persistence are newer than the baseline, so check their API before relying on them (verify). |
| 18 | Morphing and streaming HTML | Nothing framework-level: components re-render from JSON, not from server HTML; for the light fragment keep `src/lib/morph.js` or idiomorph applied to a `ref` inside an effect; streaming: loaders return promises and `<Await promise fallback>` or `<Suspense>` stream sections into the SSR response; the chunked-fetch progressive morph and `moveBefore` versus `insertBefore` are hand-written as in the baseline. |
| 19 | Platform navigation | The router is History-API based with its own matcher (`router.history`); `viewTransition: true` on `<Link>`/`navigate` or `defaultViewTransition` gives same-document transitions and `<Link preload="intent">` replaces speculation rules once hydrated; light page: `@view-transition { navigation: auto }`, `rel="expect"` and `<script type="speculationrules">` emitted from `head()` apply to full-document loads only; heavy page: the baseline's Navigation-API + URLPattern router in a client-only route (`ssr: false`) under a `$` splat route that serves the shell, or accept that the router itself is the deliverable. |
| 20 | Error boundaries | `errorComponent` per route (`error` and `reset` props; `defaultErrorComponent`), `notFoundComponent`, `<CatchBoundary getResetKey onCatch>` for section-level fallback; retry through `router.invalidate()` or a Query `refetch` with `retry`/`retryDelay` (exponential by default); server-function errors serialise to the client; global `error`/`unhandledrejection` handlers in a `__root.tsx` effect, fingerprinting and `POST /api/errors` hand-rolled, or Sentry's Start SDK; Solid flavour: `<ErrorBoundary>`. |
| 21 | Observability | Router and Query devtools in dev; React 19.2 Performance Tracks in the profiler; `web-vitals` or the baseline's PerformanceObserver code in a root effect; `Server-Timing` set with `setResponseHeader` from `@tanstack/react-start/server` inside server functions and server routes; no OpenTelemetry integration: a `createMiddleware` that opens a span around `next()` with `@opentelemetry/api`, and the Nitro server instrumented like any Node server (the 5x SSR throughput write-up is the profiling reference). |
| 22 | Security hardening | Trusted Types: a named policy by hand and DOMPurify before any `dangerouslySetInnerHTML`; CSRF: server functions are same-origin POSTs, so add an `Origin` check or the double-submit cookie (`getCookie`/`setCookie`) in a function middleware; after the May 2026 compromise pin versions and run `npm audit signatures`; CSP: hydration and dehydrated loader data ship as inline scripts, so a strict policy needs a per-request nonce or build hashes, set from a request middleware (`createMiddleware({ type: 'request' })`) or the custom `server.ts` handler, and the router's nonce plumbing needs checking (verify). |
| 23 | Styling strategy | No framework scoping: Vite's CSS pipeline, global stylesheets as `?url` imports listed in `head()` `links`, CSS Modules, Tailwind 4 with `@tailwindcss/vite` (shadcn/ui builds on it), Lightning CSS as Vite's `css.transformer`, Panda or vanilla-extract as Vite plugins; the baseline's tokens, `light-dark()`, layers, `@scope`, container queries and `@property` are plain CSS and pass through unchanged; Solid flavour identical. |

## Migrating the baseline

1. `npm create @tanstack/start@latest`; add `mockApi()` to `vite.config.ts` or port endpoints to server routes.
2. Partials become `__root.tsx`; pages become file routes; `api.js` → loaders + Query; `router.js` → gone.

## From the 2025–26 blog

Start 1.0 builds on Nitro and also supports Rsbuild; TanStack DB (client database, query-driven sync, persistence and offline) covers the sync candidate pattern; TanStack AI speaks AG-UI and MCP; a May 2026 npm supply-chain compromise was followed by a public postmortem and hardened publishing (trusted publishing, pinned actions, non-SMS 2FA).

## Watch out for

- Young and fast-moving: 1.x, with a long version number and frequent changes; pin and record the version.
- Type-heavy by design; the floor includes learning the router's type conventions.
- Build and deploy wiring (Vite plugin, adapters) changed during 2025; follow the current docs rather than blog posts.

## Links

- https://tanstack.com/start, https://tanstack.com/router
