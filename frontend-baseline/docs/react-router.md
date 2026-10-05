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
