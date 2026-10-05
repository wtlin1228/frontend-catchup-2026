# SvelteKit

| | |
|---|---|
| Kind | Svelte meta-framework: file routing, `load` functions, form actions, remote functions, adapters. |
| Version checked (2026-10-05) | @sveltejs/kit 3.0.0 (released after a September release candidate; requires Svelte 5, Node 22, TypeScript 6) |
| Reactivity | Svelte 5 runes (see svelte.md). |
| Rendering | SSR by default, prerendering per route, SPA mode, hybrid; streaming promises from `load`. |
| Best at | Progressive enhancement with little code; small client bundles. |

## Pattern map

| # | Pattern | How you build it in SvelteKit |
|---|---|---|
| 1 | Static content | `+layout.svelte`, `+page.svelte`, `export const prerender = true`; `<svelte:head>`. |
| 2 | Forms | Form actions in `+page.server.ts` work without JS; `use:enhance` adds pending and client-side handling; remote `form` functions with `submitted` state; uploads via `request.formData()`. |
| 3 | Dynamic | `load` in `+page.server.ts` (server) or `+page.ts` (universal); `data` prop; `invalidate`/`invalidateAll`; `data-sveltekit-preload-data`; remote `query` and `command` functions with optimistic updates; `+error.svelte` renders on both load and render failures in Kit 3. |
| 4 | Client state | `.svelte.js` modules with `$state`; `$app/state` for page state; shallow routing (`goto` with `state` in Kit 3). |
| 5 | 3D | `browser` check or `onMount`; Threlte; dynamic import inside `onMount`. |
| 6 | Real-time | `+server.ts` streaming SSE with `ReadableStream`; `$effect` subscription in the component. |
| 7 | Media | `@sveltejs/enhanced-img` for build-time images; native dialog. |
| 8 | Cross-cutting | `hooks.server.ts` `handle` for sessions and theme cookies; `event.locals`; redirects in `load`; Paraglide for i18n. |
| 9 | Content | mdsvex; `import.meta.glob` collections; `+server.ts` for feeds and sitemaps. |
| 10 | Data grid | TanStack Table/Virtual (Svelte adapters). |
| 11 | Composite widgets | Bits UI, Melt UI, shadcn-svelte. |
| 12 | Motion | Svelte transitions and `animate:flip`; `onNavigate` + `document.startViewTransition` for page transitions. |
| 13 | Offline | Built-in service worker support (`$app/service-worker` in Kit 3 exposes build files and prerendered routes). |

## Migrating the baseline

1. `npx sv create app`; Kit 3 takes its config through the Vite plugin, so add `mockApi()` beside it or port endpoints to `+server.ts` files.
2. Partials become `+layout.svelte`; pages become route directories (`src/routes/<pattern>/light/+page.svelte`).
3. `api.js` → `load`/remote functions; `router.js` → gone; `store.js` → `$state` modules; `theme.js` → a cookie in `hooks.server.ts`.

## Watch out for

- Kit 3 is days old: `$lib` became `#lib` (Node subpath imports), service-worker and env modules moved, adapters now bundle with Rolldown; migrate existing apps with `npx sv migrate sveltekit-3`.
- Server vs universal `load`: the wrong one leaks secrets or breaks prerendering.
- Remote functions are the newest data API; decide whether the port uses them or classic `load` + actions, and record it.

## Links

- https://svelte.dev/docs/kit
