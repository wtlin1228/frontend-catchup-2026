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
