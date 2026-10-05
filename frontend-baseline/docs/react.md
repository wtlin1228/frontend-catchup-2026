# React

| | |
|---|---|
| Kind | UI library: components and rendering only. Routing, data and a server come from a meta-framework (Next.js, React Router framework mode, TanStack Start) or libraries. |
| Version checked (2026-10-05) | react 19.3.0 |
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
| 12 | Motion | Motion (formerly Framer Motion) for layout/FLIP animations and `AnimatePresence`; `document.startViewTransition` with `flushSync`; `<ViewTransition>` is experimental in React, check its status. |
| 13 | Offline | `vite-plugin-pwa` (Workbox) or Serwist; the manifest is static. |

## Migrating the baseline

1. `npm create vite@latest app -- --template react-ts`; add `htmlPartials()` is unnecessary (layouts are components) but keep `mockApi()` in `vite.config.ts`.
2. `src/partials/*` become `<Layout>`, `<Header>`, `<VariantNav>` components; the inline theme script stays inline in `index.html`.
3. Each `<pattern>/<variant>.html` becomes a route in React Router (framework mode gives SSG/SSR per route; data mode keeps a plain SPA).
4. `src/lib/store.js` → Zustand or a reducer; `router.js` → React Router; `api.js` → TanStack Query; `toast.js` → a context + portal; `elements.js` stays a custom element or becomes a component.
5. Keep `src/lib/rows.js` and the worker unchanged.

## From the 2025–26 blog

React Foundation (Linux Foundation) now owns React; Compiler 1.0; 19.2 added `<Activity>` (state that survives being hidden), Performance Tracks and `useEffectEvent`; View Transitions remain a Labs feature; an RSC security advisory shipped in late 2025. Port the "state that survives navigation" candidate with `<Activity>`.

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
