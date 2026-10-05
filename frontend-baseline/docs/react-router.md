# React Router

| | |
|---|---|
| Kind | Router for React with three modes: declarative (just routing), data (loaders/actions, no server), framework (Vite plugin: SSR, SSG, code splitting; this is what Remix v2 became). |
| Version checked (2026-10-05) | react-router 8.4.0 (released June 2026; yearly majors from now on; v6 and Remix v2 are end of life) |
| Reactivity | React. |
| Rendering | Client in declarative/data mode; SSR, prerendering and SPA mode in framework mode; React Server Components framework mode exists but is still marked unstable. |
| Best at | Progressive enhancement and web-standards data flow (Request/Response, Form) in React. |

## Pattern map

| # | Pattern | How you build it in React Router (framework mode) |
|---|---|---|
| 1 | Static content | Routes with `prerender: true`; nested layouts via `routes.ts` and `<Outlet>`; `meta` exports. |
| 2 | Forms | `<Form method="post">` + route `action` works without JS; `useNavigation` for pending; `useActionData` for server errors; `useFetcher` for non-navigating submits; uploads via `parseFormData`. |
| 3 | Dynamic | `loader` per route (server) and `clientLoader` (browser, with caching by hand or TanStack Query); `<Link prefetch="intent">`; `useFetcher` for optimistic UI; `ErrorBoundary` exports; `useRouteLoaderData`. |
| 4 | Client state | Outside the router: Zustand or a reducer; the router owns URL state only. |
| 5 | 3D | `.client.tsx` modules and `clientOnly` patterns; `lazy` route modules split the chunk. |
| 6 | Real-time | Resource route streaming SSE; `useEffect` subscription in the component. |
| 7 | Media | Plain `<img>` or unpic; no built-in image component. |
| 8 | Cross-cutting | Middleware (enabled by default in v8) for sessions and redirects; cookies via `createCookieSessionStorage`; theme from a cookie in the root loader. |
| 9 | Content | MDX via Vite; collections by `import.meta.glob`; feeds as resource routes. |
| 10 | Data grid | TanStack Table/Virtual in a client-only route. |
| 11 | Composite widgets | Radix, React Aria. |
| 12 | Motion | Motion for React; `useViewTransitionState` and `<Link viewTransition>` are built in. |
| 13 | Offline | `vite-plugin-pwa` works since framework mode is a Vite plugin. |
| 14 | Async consistency | Navigations run inside `React.startTransition`, so the current route stays on screen until every loader resolves (atomic by default) and `useNavigation().state === "loading"` dims it; a new navigation aborts the previous loaders through `request.signal`, so the latest wins; `useFetcher` gives each tab its own in-flight state. Heavy: return un-awaited promises from the loader and render each source in `<Suspense>` + `<Await errorElement>` to stream, with the dependent source awaited inside the loader; per-source retry with `fetcher.load()`, optimistic UI from `fetcher.formData`, rolled back by revalidation. |
| 15 | State across navigation | `<ScrollRestoration>` in `root.tsx` (with `getKey` to key by path) restores scroll on back; the filter lives in the URL via `useSearchParams` or the loader; `shouldRevalidate` stops the list loader re-running on return and `clientLoader` can cache. Heavy: nothing like `<KeepAlive>`; keep the three tabs in one route component under React 19.2 `<Activity mode="hidden">` or in state held outside the router (Zustand), pausing the animation by hand; `navigate(to, { state })` and `useLocation().state` carry per-entry state; do not write `history.state` yourself, the router owns it. |
| 16 | Server functions | No server functions; the shape is route `action`s and resource routes called with `useFetcher().submit()` and `fetcher.load()`, which is the light page; several fetchers run concurrently but nothing batches or dedupes calls; return `data({ errors }, 422)` for validation; guard with v8 middleware and its context; the live subscription is a resource route streaming `text/event-stream` (`remix-utils` `eventStream` and `useEventSource`); for the baseline's single endpoint, dispatch table and batching mount tRPC or oRPC on a splat resource route or keep `src/lib/rpc.js`; `"use server"` exists only in the unstable RSC mode. |
| 17 | Sync and local-first | Nothing built in; `clientAction` applies the write locally and queues it, `clientLoader` reads the local store (`clientLoader.hydrate = true` with a `HydrateFallback` so first paint is local data without a mismatch), and the outbox replays to the server `action` on `online`; keep `src/lib/sync.js` or use TanStack DB, Replicache, Zero or Electric for the store; the versioned log and the change feed port to resource routes (SSE). |
| 18 | Morphing and streaming HTML | Not the model: revalidation re-runs loaders and React reconciles the route component, so focus and typed text in the live component survive (light page: `useRevalidator` or `fetcher.load` on an interval); streaming is `renderToPipeableStream` in `entry.server.tsx` plus promises from loaders rendered with `<Suspense>` and `<Await>`; for raw HTML fragments nothing is built in: keep `src/lib/morph.js` or idiomorph in an effect and feature-detect `Element.moveBefore` by hand. |
| 19 | Platform navigation | The router runs on the History API with its own matcher, not the Navigation API or URLPattern. Light: prerendered routes are static documents, so `<script type="speculationrules">`, `<link rel="expect" blocking="render">` and `view-transition-name` in `root.tsx` work for hard loads; `<Link>` makes clicks same-document, where `<Link viewTransition>` applies (row 12). Heavy: the Navigation-API router is React Router itself: `route("navigation/app/*", …)` in `routes.ts`, the server serves the shell for any URL, loaders abort on cancellation, `<ScrollRestoration>` for scroll, focus by hand; no entries list, read `window.navigation` where it exists. |
| 20 | Error boundaries | `ErrorBoundary` export per route module catches loader, action and render errors from its subtree, `useRouteError` and `isRouteErrorResponse` read them, the root one is the global fallback; `handleError` in `entry.server.tsx` reports server failures. Light: client `error` and `unhandledrejection` listeners by hand in `root.tsx`. Heavy: three sources as three `<Await errorElement>` or three fetchers, each with its own fallback and `fetcher.load()` as retry (child routes give per-section boundaries too, but one `<Outlet>` cannot show three side by side); backoff and fingerprinting by hand or `@sentry/react-router`. |
| 21 | Observability | Nothing built in. Light: `web-vitals` or the baseline's PerformanceObserver code in a `root.tsx` effect. Heavy: v8 middleware wraps every loader and action, so one middleware times `await next()` and sets `Server-Timing` on the response; OpenTelemetry through `@opentelemetry/sdk-node` in a custom server or `entry.server.tsx`; browser spans by hand or the OTel web SDK; `fetcher.load` cannot set a `traceparent` header, so pass the trace id in a search param or cookie; React Performance Tracks and the community `react-router-devtools`. |
| 22 | Security hardening | Nonce CSP: generate the nonce per request in `entry.server.tsx`, set the header on the response and pass it to `<Scripts nonce>`, `<ScrollRestoration nonce>` and `renderToPipeableStream({ nonce })`. Heavy: a Trusted Types policy by hand, DOMPurify or the baseline sanitiser, CSRF with `remix-utils` `CSRF` or the baseline double-submit checked in the `action`; session cookies `httpOnly`, `secure`, `sameSite: "lax"` from `createCookieSessionStorage`; pin and verify package versions after the May 2026 npm compromise. Prerendered routes have no request, so the light page's inline hydration script needs a build-time hash computed by hand (verify). |
| 23 | Styling strategy | Vite's CSS pipeline: a side-effect import or `links` export for global CSS, CSS Modules, `@tailwindcss/vite`, Lightning CSS via `css.transformer`, vanilla-extract as a plugin; runtime CSS-in-JS needs an SSR collector in `entry.server.tsx`. Light: the baseline's tokens, `light-dark()` and layers import unchanged, with the theme class from the cookie in the root loader (row 8) so there is no flash. Heavy: `@scope`, container queries, `@property`, `:has()` and subgrid pass through for a modern `build.cssTarget`; CSS Modules are the scoping unit if `@scope` is not wanted. |

## Migrating the baseline

1. `npx create-react-router@latest` (ships an agent skill and docs in `node_modules`); add `mockApi()` to `vite.config.ts` next to the React Router plugin.
2. Partials become `root.tsx` and layout routes; pages become route modules in `routes.ts`.
3. `api.js` → loaders and actions; `router.js` → gone; `store.js` → client store; `toast.js` → a context.

## From the 2025–26 blog

Yearly majors from v8; docs ship in `node_modules` and `create-react-router` installs an agent skill; React Router packages were among those hit by the May 2026 TanStack-related npm compromise, so pin and verify versions.

## Watch out for

- Pick the mode before porting; the pattern map above assumes framework mode. Data mode keeps the baseline's "SPA + API" shape.
- `react-router-dom` no longer exists in v8 (`react-router` and `react-router/dom`); ESM only; React 19.2.7+.
- Upgrade path from v6 or Remix v2 goes through v7 first.
- RSC framework mode is unstable; do not build the comparison on it unless that is the question.

## Links

- https://reactrouter.com
- https://remix.run/blog/react-router-v8
