# Qwik

| | |
|---|---|
| Kind | Resumable framework with its own router (Qwik City / Qwik Router). |
| Version checked (2026-10-05) | @builder.io/qwik 1.20.1 (v1 line); @qwik.dev/core and @qwik.dev/router 2.0.0-rc.0 (v2 line, new package names) |
| Reactivity | Signals (`useSignal`, `useStore`, `useComputed$`, `useTask$`) with serialisable state; no hydration: the app resumes from HTML. |
| Rendering | SSR/SSG by default; code is split at every `$` boundary and loaded on interaction. |
| Best at | Minimal JavaScript on first load regardless of app size. |

## Pattern map

| # | Pattern | How you build it in Qwik |
|---|---|---|
| 1 | Static content | Default output: HTML with almost no JS; `routes/layout.tsx` for layouts; static adapter for prerendering. |
| 2 | Forms | `routeAction$` with `Form` (progressive by default), `zod$` validation, `useSignal` for client state. |
| 3 | Dynamic | `routeLoader$` runs on the server per request; `useNavigate`, `Link` with prefetch; `server$` for RPC; optimistic UI by hand with signals. |
| 4 | Client state | `useStore` (deep) or `useSignal`; undo via serialisable snapshots; `useContextProvider` for sharing. |
| 5 | 3D | `useVisibleTask$` (runs eagerly in the browser) with a ref and cleanup; three.js stays an ordinary import inside the task. |
| 6 | Real-time | `useVisibleTask$` opens the EventSource; signals update the DOM; the serialisation boundary means handlers must not close over non-serialisable objects. |
| 7 | Media | `<Image>` from `@unpic/qwik` or `qwik-image`; native dialog via ref. |
| 8 | Cross-cutting | `plugin@*.ts` middleware for sessions and redirects; context for theme; `compiled-i18n` / `qwik-speak`. |
| 9 | Content | MDX supported natively in routes; collections via `import.meta.glob`. |
| 10 | Data grid | Hand-written virtual list (as in the baseline) or TanStack Virtual core; workers via Vite. |
| 11 | Composite widgets | Qwik UI (headless + styled). |
| 12 | Motion | CSS and WAAPI by hand; no built-in transition primitives. |
| 13 | Offline | Qwik City service worker helper for prefetching; `vite-plugin-pwa` for caching. |

## Migrating the baseline

1. `npm create qwik@latest`; keep `mockApi()` in `vite.config` or move endpoints to `routes/api/*/index.ts`.
2. Layouts are `layout.tsx` files; pages are route folders.
3. `api.js` → `routeLoader$`/`server$`; `store.js` → `useStore`; `router.js` → Qwik Router; `toast.js` → a context + signal.

## Watch out for

- Everything crossing a `$` boundary must be serialisable; closures over DOM nodes, class instances or functions fail at build or runtime.
- First interaction can lag while the handler chunk loads; measure it on the board page.
- v1 (`@builder.io/*`) and v2 (`@qwik.dev/*`) differ in package names and some APIs; pick one and record it. Governance moved from Builder to a community team; check release cadence.
- Smaller ecosystem; React components can be embedded with `qwikify$` at the cost of hydration for that island.

## Links

- https://qwik.dev
