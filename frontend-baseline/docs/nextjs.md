# Next.js

| | |
|---|---|
| Kind | React meta-framework from Vercel: App Router, React Server Components, server actions, caching, image and font optimisation, Turbopack. |
| Version checked (2026-10-05) | next 16.3.8 |
| Reactivity | React (see react.md). Server Components run only on the server; client components are opted in with `"use client"`. |
| Rendering | Static, dynamic (per request), streaming, partial prerendering, cache components (`"use cache"`); Pages Router is legacy. |
| Best at | React apps that need server rendering, SEO and a large hosting ecosystem. |

## Pattern map

| # | Pattern | How you build it in Next.js |
|---|---|---|
| 1 | Static content | Server components rendered at build time; `layout.tsx` nesting; `generateMetadata`; `next/font` self-hosts fonts like the baseline's fontsource. |
| 2 | Forms | Server actions: `<form action={serverFn}>` works without JS, `useActionState` and `useFormStatus` add pending and errors, Zod on the server; uploads as `FormData` in the action (progress still needs a client XHR). |
| 3 | Dynamic | File routes with `[id]`, `loading.tsx` (Suspense), `error.tsx` (error boundaries), `fetch` in server components with cache tags, `revalidateTag`, `<Link prefetch>`, `useOptimistic`; search params via `useSearchParams` or `nuqs`. |
| 4 | Client state | A `"use client"` component with Zustand or a reducer; persisted state must be read after mount to avoid hydration mismatch. |
| 5 | 3D | `next/dynamic(() => import(...), { ssr: false })` or a client component with effects; react-three-fiber. |
| 6 | Real-time | Route Handler streaming SSE (`ReadableStream`); client component with `useEffect` + `useSyncExternalStore`; keep it out of the server-component tree. |
| 7 | Media | `next/image` (sizes, formats, lazy, placeholder); the gallery's build-time JSON becomes a server component reading the file system. |
| 8 | Cross-cutting | `proxy.ts` (the file formerly called middleware) for redirects and session checks; cookies read on the server so theme and session render correctly first time; Context providers in a client layout; `next-intl`. |
| 9 | Content | `@next/mdx` with App Router, or Contentlayer-style tools; collections by hand or via a CMS; `sitemap.ts` and `route.ts` feeds are first-class. |
| 10 | Data grid | Client component with TanStack Table/Virtual; workers via `new Worker(new URL())` (Turbopack supports it; verify). |
| 11 | Composite widgets | Radix, React Aria, shadcn/ui. |
| 12 | Motion | Motion for React; `next-view-transitions` or the experimental React `<ViewTransition>`. |
| 13 | Offline | Serwist (`@serwist/next`); a manifest via `app/manifest.ts`. |
| 14 | Async consistency | React transitions: `useTransition` keeps the old tab on screen and `isPending` dims it, a newer transition supersedes an in-flight one, `useLinkStatus` for pending links, `useOptimistic` rolls back when the action fails. Heavy: three server-component fetches under one `<Suspense>` commit together, under three they stream separately; `React.cache` and fetch memoisation dedupe the dependent source; per-source retry through `error.tsx` `reset()` or react-error-boundary; client-side keep-previous-data via TanStack Query or `useDeferredValue`. |
| 15 | State across navigation | Layouts stay mounted across soft navigations, the Router Cache serves back/forward without refetching and scroll restoration is built in; keep the filter in search params (`useSearchParams`, `nuqs`) so the history entry carries it. Heavy: React 19.2 `<Activity mode="hidden">` in a client component keeps the three tabs' state and DOM; hidden Activity unmounts effects and hides with `display: none`, so the animation stops and must be resumed by hand on show; parallel-route slots also keep their state across soft navigation. |
| 16 | Server functions | Server Actions: a `"use server"` function imported into a client component is the light page's one call (POST to the page URL, no endpoint to design); return `{ errors }` from Zod and read them with `useActionState`; guard inside the action with `cookies()` and the session, not in `proxy.ts`; Next checks `Origin` against `Host` on every action. Nothing batches or dedupes in-flight actions; reads go through server components and `"use cache"` rather than calls; the live subscription is a Route Handler streaming `text/event-stream`; `next-safe-action`, tRPC or oRPC for typed schemas. |
| 17 | Sync and local-first | Nothing built in; the outbox, versions and reconciliation live in a `"use client"` component: keep `src/lib/sync.js` (IndexedDB, replay on `online`) or use TanStack DB (`@tanstack/react-db`), Replicache, Zero or Electric; subscribe with `useSyncExternalStore` and read local storage only after mount to avoid a hydration mismatch; the server half (versioned `/api/sync` log, idempotent POST, SSE change feed) ports to Route Handlers; `useOptimistic` covers the light page's optimistic write but not the queue. |
| 18 | Morphing and streaming HTML | Not the model: the server sends RSC payload, not HTML fragments, and `router.refresh()` re-renders the server tree while React reconciles it into the live DOM, so client-component focus and typed text survive (light page: an interval calling `router.refresh()`, or a cache tag revalidated by an action); streaming is native through `<Suspense>` boundaries (the heavy page's progressive fill); for raw HTML from another server nothing is built in: keep `src/lib/morph.js` or idiomorph behind a `ref`; do not count on React using `Element.moveBefore` (verify). |
| 19 | Platform navigation | The App Router owns navigation (History API, `next/link`, incremental and app-shell prefetching); it uses neither the Navigation API nor URLPattern. Light: the markup is static, so `<script type="speculationrules">` and `view-transition-name` go in the layout, but `<Link>` makes clicks same-document, so cross-document transitions and `rel="expect"` apply to hard loads only; same-document transitions as in row 12. Heavy: the Navigation-API router becomes `app/navigation/app/[[...slug]]/page.tsx` (the optional catch-all is the shell) with `useRouter`, `usePathname`, `useSearchParams`; scroll and the route announcer are built in, focus by hand; no entries list, read `window.navigation` directly where it exists. |
| 20 | Error boundaries | `error.tsx` per segment (a client component receiving `error` and `reset`), `global-error.tsx` for the root layout, `not-found.tsx`; `onRequestError` in `instrumentation.ts` reports server-side failures. Light: client `error` and `unhandledrejection` listeners still have to be added by hand in a client component. Heavy: three parallel-route slots each with its own `loading.tsx` and `error.tsx`, or three `<Suspense>` + react-error-boundary pairs in one client component; `reset()` is the manual retry, the backoff timer and fingerprinting by hand or `@sentry/nextjs`. |
| 21 | Observability | `register()` in `instrumentation.ts` wires OpenTelemetry (`@vercel/otel` or the OTel SDK) and Next emits spans for rendering, `fetch` and Route Handlers; `useReportWebVitals` from `next/web-vitals` delivers the light page's metrics; React 19.2 Performance Tracks and the Next DevTools MCP for local debugging. Heavy: server spans come free, the browser side still needs the OTel web SDK or the baseline's hand-rolled spans with `traceparent` on the fetch; `Server-Timing` is set by hand in a Route Handler or `proxy.ts`. |
| 22 | Security hardening | Nonce CSP is the documented path: `proxy.ts` generates a nonce, sets the `Content-Security-Policy` header with `'nonce-…' 'strict-dynamic'` and forwards it in a request header, Next tags its own scripts and the layout gives the theme script `nonce`; reading it forces dynamic rendering. Heavy: a Trusted Types policy by hand, DOMPurify or the baseline sanitiser, CSRF on Server Actions via the built-in `Origin`/`Host` check and double-submit by hand for Route Handlers; keep `next` patched after the late-2025 RSC advisory. The light page's build-time hashes do not map to static pages, which have no hash list for the hydration scripts (verify). |
| 23 | Styling strategy | CSS Modules, global CSS in `app/globals.css`, Sass, Tailwind via PostCSS and `next/font` variables are built in; runtime CSS-in-JS needs a style registry and client components. Light: the baseline's tokens, `light-dark()` and cascade layers import unchanged as global CSS. Heavy: `@scope`, container queries, `@property`, `:has()` and subgrid are plain CSS and pass through; CSS Modules are the framework's scoping unit if `@scope` is not wanted; set `browserslist` so nothing modern is lowered away (verify). |

## Migrating the baseline

1. `npx create-next-app@latest`; run the mock API as a separate process or port it to Route Handlers under `app/api/*/route.ts` (recommended: the port then tests Next's server too).
2. Partials become nested layouts; each page a route segment (`app/<pattern>/light/page.tsx`).
3. `api.js` → server-side `fetch` with cache tags; `router.js` → file routes; `store.js` → client-side store; `theme.js` → cookie read in the root layout.

## From the 2025–26 blog

Next 16: Cache Components (`"use cache"` + partial prerendering), DevTools MCP for agents, `proxy.ts`, Turbopack with filesystem caching, incremental prefetching, layout deduplication; 16.3 added app-shell prefetching and cached navigations. The caching model is the thing to document while porting pattern 3.

## Watch out for

- The server/client boundary: hooks, browser APIs and three.js belong in `"use client"` files; data fetching and secrets stay on the server.
- Caching semantics changed across 14, 15 and 16 (fetch caching defaults, `"use cache"`, cache components): read the version's caching doc before measuring pattern 3.
- Hosting: the full feature set is simplest on Vercel; self-hosting works but check what each feature needs (image optimisation, ISR, middleware).
- A heavy floor: measure the light static page's output carefully; it is the most contested number for Next.
- Turbopack is the default bundler; Vite plugins (the mock API) do not apply.

## Links

- https://nextjs.org/docs
