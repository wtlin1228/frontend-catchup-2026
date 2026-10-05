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
